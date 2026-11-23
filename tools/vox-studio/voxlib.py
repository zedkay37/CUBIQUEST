"""Outils de modelisation voxel pour CubiQuest : volume, primitives, ecriture .vox, rendu d'apercu.

Repere (guide-vox.md) : Z = haut, la creature regarde vers -Y (tete aux Y faibles),
le voxel le plus bas touche z = 0. Symetrie gauche/droite selon X.
"""
import math
import random
import struct

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

EMPTY = 0
GLOW = range(240, 248)
EYE = 248
HIGHLIGHT = 249
LEG_L = (250, 251, 252)
LEG_R = (253, 254, 255)


class Model:
    def __init__(self, w, l, h):
        self.w, self.l, self.h = w, l, h
        self.v = np.zeros((w, l, h), dtype=np.uint8)
        self.cx = w / 2.0  # plan de symetrie

    # -- primitives (espace continu, centre des voxels en i+0.5) --------------
    def _grid(self):
        x, y, z = np.meshgrid(np.arange(self.w) + 0.5, np.arange(self.l) + 0.5,
                              np.arange(self.h) + 0.5, indexing="ij")
        return x, y, z

    def ellipsoid(self, c, r, color, mirror=False, only_empty=False):
        """c=(x,y,z) centre, r=(rx,ry,rz). x est un decalage lateral si mirror=True."""
        x, y, z = self._grid()
        centers = [c]
        if mirror:
            centers = [(self.cx + c[0], c[1], c[2]), (self.cx - c[0], c[1], c[2])]
        for cc in centers:
            m = ((x - cc[0]) / r[0]) ** 2 + ((y - cc[1]) / r[1]) ** 2 + ((z - cc[2]) / r[2]) ** 2 <= 1.0
            self._paint(m, color, only_empty)

    def box(self, x0, x1, y0, y1, z0, z1, color, mirror=False, only_empty=False):
        """Bornes en voxels entiers [x0,x1) etc. Si mirror, x0/x1 sont des decalages >= 0 depuis le centre."""
        boxes = [(x0, x1)]
        if mirror:
            c = int(self.cx)
            boxes = [(c + x0, c + x1), (c - x1, c - x0)]
        for a, b in boxes:
            sl = self.v[max(a, 0):min(b, self.w), max(y0, 0):min(y1, self.l), max(z0, 0):min(z1, self.h)]
            if only_empty:
                sl[sl == 0] = color
            else:
                sl[...] = color

    def capsule(self, p0, p1, r0, r1, color, mirror=False, only_empty=False):
        """Tronc de cone arrondi entre p0 et p1 (rayons r0 -> r1). x lateral si mirror."""
        x, y, z = self._grid()
        pairs = [(p0, p1)]
        if mirror:
            pairs = [((self.cx + p0[0], p0[1], p0[2]), (self.cx + p1[0], p1[1], p1[2])),
                     ((self.cx - p0[0], p0[1], p0[2]), (self.cx - p1[0], p1[1], p1[2]))]
        for a, b in pairs:
            a = np.array(a, float); b = np.array(b, float)
            ab = b - a
            L2 = float(ab @ ab) or 1e-9
            t = ((x - a[0]) * ab[0] + (y - a[1]) * ab[1] + (z - a[2]) * ab[2]) / L2
            t = np.clip(t, 0, 1)
            px, py, pz = a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]
            d = np.sqrt((x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2)
            m = d <= (r0 + (r1 - r0) * t)
            self._paint(m, color, only_empty)

    def _paint(self, m, color, only_empty):
        if only_empty:
            m = m & (self.v == 0)
        self.v[m] = color

    def carve(self, mask_fn):
        x, y, z = self._grid()
        self.v[mask_fn(x, y, z)] = 0

    # -- passes de couleur ------------------------------------------------------
    def neighbors_empty(self, dx, dy, dz):
        p = np.pad(self.v, 1)
        sh = p[1 + dx:1 + dx + self.w, 1 + dy:1 + dy + self.l, 1 + dz:1 + dz + self.h]
        return sh == 0

    def recolor(self, where, frm, to):
        m = where & np.isin(self.v, list(frm))
        self.v[m] = to

    def surface(self):
        filled = self.v > 0
        exp = np.zeros_like(filled)
        for d in [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]:
            exp |= self.neighbors_empty(*d)
        return filled & exp

    def crack(self, points, color, radius=0.75, frm=None):
        """Peint une fissure (polyligne 3D, x lateral miroir) sur les voxels de surface."""
        x, y, z = self._grid()
        surf = self.surface()
        allowed = surf if frm is None else surf & np.isin(self.v, list(frm))
        for sgn in (1, -1):
            pts = [np.array((self.cx + sgn * p[0], p[1], p[2]), float) for p in points]
            m = np.zeros_like(surf)
            for a, b in zip(pts, pts[1:]):
                ab = b - a
                L2 = float(ab @ ab) or 1e-9
                t = np.clip(((x - a[0]) * ab[0] + (y - a[1]) * ab[1] + (z - a[2]) * ab[2]) / L2, 0, 1)
                d = np.sqrt((x - a[0] - t * ab[0]) ** 2 + (y - a[1] - t * ab[1]) ** 2 + (z - a[2] - t * ab[2]) ** 2)
                m |= d <= radius
            self.v[m & allowed] = color

    def legs_split(self, leg_mask, colors_by_body):
        """Reattribue les voxels de pattes aux indices 250-252 (gauche, +X) / 253-255 (droite, -X)."""
        x, y, z = self._grid()
        left = x > self.cx
        for body_c, (lc, rc) in colors_by_body.items():
            m = leg_mask & (self.v == body_c)
            self.v[m & left] = lc
            self.v[m & ~left] = rc

    # -- controles ------------------------------------------------------------
    def bbox(self):
        idx = np.argwhere(self.v > 0)
        return idx.min(0), idx.max(0)

    def crop(self):
        lo, hi = self.bbox()
        self.v = self.v[lo[0]:hi[0] + 1, lo[1]:hi[1] + 1, lo[2]:hi[2] + 1].copy()
        self.w, self.l, self.h = self.v.shape
        self.cx = self.w / 2.0

    def symmetric(self):
        a = self.v.copy()
        b = self.v[::-1].copy()
        for l, r in zip(LEG_L, LEG_R):
            b2 = b.copy(); b[b2 == l] = r; b[b2 == r] = l
        return bool(np.array_equal(a, b))

    def report(self, name, palette):
        n = int((self.v > 0).sum())
        counts = {int(k): int(c) for k, c in zip(*np.unique(self.v[self.v > 0], return_counts=True))}
        glow = sum(c for k, c in counts.items() if 240 <= k <= 247)
        surf = int(self.surface().sum())
        glow_surf = int((self.surface() & (self.v >= 240) & (self.v <= 247)).sum())
        eyes = np.argwhere(self.v == EYE)
        lines = [f"== {name} ==",
                 f"taille X(largeur)={self.w} Y(longueur)={self.l} Z(hauteur)={self.h}",
                 f"voxels={n}  surface={surf}  lave en surface={glow_surf} ({100*glow_surf/surf:.1f} %)",
                 f"symetrie X : {'OK' if self.symmetric() else 'ECHEC'}",
                 f"yeux : {len(eyes)} voxels, Y min={eyes[:,1].min() if len(eyes) else '-'}",
                 f"indices utilises : {sorted(counts)}"]
        return "\n".join(lines)


# -- ecriture .vox (MagicaVoxel, version 150) ----------------------------------
def write_vox(model, path, palette):
    """palette : dict indice(1..255) -> (r,g,b). L'entree k du chunk RGBA = indice k+1."""
    w, l, h = model.v.shape
    assert max(w, l, h) <= 256
    idx = np.argwhere(model.v > 0)
    xyzi = bytearray()
    for x, y, z in idx:
        xyzi += struct.pack("<4B", int(x), int(y), int(z), int(model.v[x, y, z]))
    rgba = bytearray()
    for k in range(256):
        r, g, b = palette.get(k + 1, (128, 128, 128))
        rgba += struct.pack("<4B", r, g, b, 255)

    def chunk(cid, content, children=b""):
        return cid + struct.pack("<ii", len(content), len(children)) + content + children

    size = chunk(b"SIZE", struct.pack("<3i", w, l, h))
    xyzi_c = chunk(b"XYZI", struct.pack("<i", len(idx)) + bytes(xyzi))
    rgba_c = chunk(b"RGBA", bytes(rgba))
    main = chunk(b"MAIN", b"", size + xyzi_c + rgba_c)
    with open(path, "wb") as f:
        f.write(b"VOX " + struct.pack("<i", 150) + main)


def read_vox(path):
    """Relecture independante, pour verifier le fichier ecrit."""
    data = open(path, "rb").read()
    assert data[:4] == b"VOX ", "en-tete invalide"
    ver = struct.unpack("<i", data[4:8])[0]
    pos = 8
    out = {"version": ver}

    def parse(pos, end):
        while pos < end:
            cid = data[pos:pos + 4]
            n, m = struct.unpack("<ii", data[pos + 4:pos + 12])
            body = data[pos + 12:pos + 12 + n]
            if cid == b"SIZE":
                out.setdefault("size", struct.unpack("<3i", body))
            elif cid == b"XYZI" and "voxels" not in out:
                cnt = struct.unpack("<i", body[:4])[0]
                out["voxels"] = [tuple(body[4 + 4 * i:8 + 4 * i]) for i in range(cnt)]
            elif cid == b"RGBA":
                out["rgba"] = [tuple(body[4 * i:4 * i + 4]) for i in range(256)]
            if m:
                parse(pos + 12 + n, pos + 12 + n + m)
            pos += 12 + n + m

    parse(pos, len(data))
    return out


# -- rendu d'apercu (orthographique, ombrage simple + occlusion + halo de lave) --
def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


FACES = {
    (1, 0, 0): [(1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)],
    (-1, 0, 0): [(0, 0, 0), (0, 1, 0), (0, 1, 1), (0, 0, 1)],
    (0, 1, 0): [(0, 1, 0), (1, 1, 0), (1, 1, 1), (0, 1, 1)],
    (0, -1, 0): [(0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)],
    (0, 0, 1): [(0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)],
    (0, 0, -1): [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)],
}


def render_painter(model, palette, cam, scale=14, size=None, bg=(24, 22, 30), light=(-0.45, -0.7, 1.0),
           ambient=0.42, bloom=True, outline=False):
    v = model.v
    c = np.array(cam, float); c /= np.linalg.norm(c)
    f = -c
    upw = np.array((0, 0, 1.0))
    r = np.cross(f, upw)
    if np.linalg.norm(r) < 1e-6:
        r = np.array((1.0, 0, 0))
    r /= np.linalg.norm(r)
    u = np.cross(r, f)
    L = np.array(light, float); L /= np.linalg.norm(L)
    filled = v > 0
    P = np.pad(filled, 1)

    polys = []
    for (nx, ny, nz), corners in FACES.items():
        n = np.array((nx, ny, nz), float)
        if n @ c <= 1e-6:
            continue
        nb = P[1 + nx:1 + nx + v.shape[0], 1 + ny:1 + ny + v.shape[1], 1 + nz:1 + nz + v.shape[2]]
        vis = filled & ~nb
        lam = ambient + (1 - ambient) * max(0.0, float(n @ L))
        # deux axes du plan de la face, pour l'occlusion
        axes = [a for a in ((1, 0, 0), (0, 1, 0), (0, 0, 1)) if abs(np.dot(a, n)) < 0.5]
        for x, y, z in np.argwhere(vis):
            ci = int(v[x, y, z])
            col = np.array(palette[ci], float)
            if 240 <= ci <= 248:
                shade = 1.0
            else:
                occ = 0
                for da in (-1, 0, 1):
                    for db in (-1, 0, 1):
                        if da == 0 and db == 0:
                            continue
                        q = np.array((x, y, z)) + n.astype(int) + da * np.array(axes[0]) + db * np.array(axes[1])
                        if P[q[0] + 1, q[1] + 1, q[2] + 1]:
                            occ += 1
                shade = lam * (1 - 0.06 * occ)
            pts3 = [np.array((x + a, y + b, z + cc), float) for a, b, cc in corners]
            center = np.array((x + 0.5, y + 0.5, z + 0.5)) + 0.5 * n
            depth = center @ f
            pts2 = [(p @ r, -(p @ u)) for p in pts3]
            polys.append((depth, pts2, tuple(int(min(255, k * shade)) for k in col), 240 <= ci <= 248))
    polys.sort(key=lambda t: -t[0])
    xs = [p[0] for t in polys for p in t[1]]
    ys = [p[1] for t in polys for p in t[1]]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    pad = 2
    W = int((maxx - minx + 2 * pad) * scale)
    H = int((maxy - miny + 2 * pad) * scale)
    img = Image.new("RGB", (W, H), bg)
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(img)
    dg = ImageDraw.Draw(glow)
    for depth, pts, col, is_glow in polys:
        pp = [((px - minx + pad) * scale, (py - miny + pad) * scale) for px, py in pts]
        d.polygon(pp, fill=col, outline=(0, 0, 0) if outline else col)
        dg.polygon(pp, fill=col if is_glow else (0, 0, 0))
    if bloom:
        g = glow.filter(ImageFilter.GaussianBlur(scale * 0.9))
        img = Image.fromarray(np.clip(np.array(img, int) + (np.array(g, int) * 0.9).astype(int), 0, 255).astype(np.uint8))
    if size:
        img.thumbnail(size, Image.LANCZOS)
    return img


VIEWS = {
    "3/4 avant": (1.0, -0.75, 0.55),
    "face": (0.0, -1.0, 0.18),
    "profil": (1.0, 0.0, 0.12),
    "3/4 arriere": (-0.8, 1.0, 0.6),
}


def font(sz, bold=False):
    p = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(p, sz)


def planche(model, palette, title, subtitle, path, combat_px=64):
    bg = (24, 22, 30)
    big = render(model, palette, VIEWS["3/4 avant"], scale=18, bg=bg)
    others = [(k, render(model, palette, VIEWS[k], scale=10, bg=bg)) for k in ("face", "profil", "3/4 arriere")]
    # taille combat : rendu puis reduction a ~combat_px de haut, re-agrandi au plus proche
    small = render(model, palette, VIEWS["3/4 avant"], scale=6, bg=bg, bloom=False)
    ratio = combat_px / small.height
    small = small.resize((max(1, int(small.width * ratio)), combat_px), Image.LANCZOS)
    small_up = small.resize((small.width * 3, small.height * 3), Image.NEAREST)
    sil = Image.fromarray(np.where((np.array(small) != np.array(bg)).any(-1, keepdims=True), 235, 30).repeat(3, -1).astype(np.uint8))
    sil_up = sil.resize((sil.width * 3, sil.height * 3), Image.NEAREST)

    colw = max(o.width for _, o in others)
    W = big.width + colw + 60
    H = max(big.height + small_up.height + 120, sum(o.height for _, o in others) + 3 * 40 + 90)
    canvas = Image.new("RGB", (W, H), bg)
    dr = ImageDraw.Draw(canvas)
    dr.text((20, 14), title, font=font(30, True), fill=(255, 170, 60))
    dr.text((20, 52), subtitle, font=font(16), fill=(200, 196, 210))
    canvas.paste(big, (10, 80))
    y = 80
    for k, o in others:
        dr.text((big.width + 30, y), k, font=font(15, True), fill=(220, 220, 230))
        canvas.paste(o, (big.width + 30, y + 22))
        y += o.height + 40
    yb = 80 + big.height + 10
    dr.text((20, yb), f"taille combat (~{combat_px} px de haut, agrandi x3) et silhouette", font=font(15, True), fill=(220, 220, 230))
    canvas.paste(small_up, (20, yb + 24))
    canvas.paste(sil_up, (40 + small_up.width, yb + 24))
    canvas.save(path)
    return canvas


# -- rendu exact par lancer de rayons (DDA), remplace le peintre -------------------
def render_rt(model, palette, cam, scale=14, bg=(24, 22, 30), light=(-0.45, -0.7, 1.0),
              ambient=0.40, bloom=True, edges=True, ss=2):
    v = model.v
    W3, L3, H3 = v.shape
    c = np.array(cam, float); c /= np.linalg.norm(c)
    f = -c
    r = np.cross(f, (0, 0, 1.0))
    if np.linalg.norm(r) < 1e-6:
        r = np.array((1.0, 0, 0))
    r /= np.linalg.norm(r)
    u = np.cross(r, f)
    center = np.array((W3, L3, H3)) / 2.0
    # etendue a l'ecran : projeter les 8 coins
    corners = np.array([(a, b, cc) for a in (0, W3) for b in (0, L3) for cc in (0, H3)], float) - center
    pr, pu = corners @ r, corners @ u
    pad = 1.5
    sc = scale * ss
    nx_ = int((pr.max() - pr.min() + 2 * pad) * sc)
    ny_ = int((pu.max() - pu.min() + 2 * pad) * sc)
    ii, jj = np.meshgrid(np.arange(nx_), np.arange(ny_))
    sx = pr.min() - pad + (ii + 0.5) / sc
    sy = pu.max() + pad - (jj + 0.5) / sc
    D = np.linalg.norm((W3, L3, H3)) + 5
    O = center + sx[..., None] * r + sy[..., None] * u - D * f
    O = O.reshape(-1, 3)
    n = O.shape[0]
    d = np.tile(f, (n, 1))
    with np.errstate(divide="ignore", invalid="ignore"):
        inv = 1.0 / d
        t0 = (0 - O) * inv
        t1 = (np.array((W3, L3, H3)) - O) * inv
    tmin = np.minimum(t0, t1); tmax = np.maximum(t0, t1)
    tmin = np.nan_to_num(tmin, nan=-np.inf); tmax = np.nan_to_num(tmax, nan=np.inf)
    tenter = tmin.max(1); texit = tmax.min(1)
    active = texit > max(tenter.min(), 0) - 1
    active &= texit > tenter
    enter_axis = tmin.argmax(1)
    p = O + (tenter[:, None] + 1e-6) * d
    vox = np.floor(p).astype(int)
    vox = np.clip(vox, 0, np.array((W3 - 1, L3 - 1, H3 - 1)))
    step = np.sign(d).astype(int)
    with np.errstate(divide="ignore", invalid="ignore"):
        nextb = vox + (step > 0)
        tMax = np.where(d != 0, (nextb - O) / d, np.inf)
        tDelta = np.where(d != 0, np.abs(1.0 / d), np.inf)
    hit = np.zeros(n, bool)
    hit_idx = np.zeros(n, np.uint8)
    hit_vox = np.zeros((n, 3), int)
    hit_axis = enter_axis.copy()
    hit_t = np.zeros(n)
    last_axis = enter_axis.copy()
    last_t = tenter.copy()
    for _ in range(W3 + L3 + H3 + 3):
        inb = active & ~hit & (vox >= 0).all(1) & (vox < (W3, L3, H3)).all(1)
        if not inb.any():
            break
        vv = np.zeros(n, np.uint8)
        k = np.where(inb)[0]
        vv[k] = v[vox[k, 0], vox[k, 1], vox[k, 2]]
        newhit = inb & (vv > 0)
        hit_idx[newhit] = vv[newhit]
        hit_vox[newhit] = vox[newhit]
        hit_axis[newhit] = last_axis[newhit]
        hit_t[newhit] = last_t[newhit]
        hit |= newhit
        go = inb & ~newhit
        ax = tMax.argmin(1)
        rows = np.arange(n)
        last_t = np.where(go, tMax[rows, ax], last_t)
        last_axis = np.where(go, ax, last_axis)
        vox[go, ax[go]] += step[go, ax[go]]
        tMax[go, ax[go]] += tDelta[go, ax[go]]
        active &= ~(~inb & ~hit)  # sorti de la grille
    img = np.tile(np.array(bg, float), (n, 1))
    glow = np.zeros((n, 3))
    L = np.array(light, float); L /= np.linalg.norm(L)
    h = np.where(hit)[0]
    if len(h):
        axis = hit_axis[h]
        nrm = np.zeros((len(h), 3), int)
        nrm[np.arange(len(h)), axis] = -step[h, axis]
        cols = np.array([palette.get(int(i), (255, 0, 255)) for i in range(256)], float)
        col = cols[hit_idx[h]]
        lam = ambient + (1 - ambient) * np.clip(nrm @ L, 0, 1)
        P = np.pad(v > 0, 1)
        occ = np.zeros(len(h))
        others = [np.eye(3, dtype=int)[(axis + 1) % 3], np.eye(3, dtype=int)[(axis + 2) % 3]]
        base = hit_vox[h] + nrm
        for da in (-1, 0, 1):
            for db in (-1, 0, 1):
                if da == 0 and db == 0:
                    continue
                q = base + da * others[0] + db * others[1] + 1
                q = np.clip(q, 0, np.array(P.shape) - 1)
                occ += P[q[:, 0], q[:, 1], q[:, 2]]
        shade = lam * (1 - 0.055 * occ)
        isglow = (hit_idx[h] >= 240) & (hit_idx[h] <= 248)
        shade = np.where(isglow, 1.0, shade)
        if edges:
            pt = O[h] + hit_t[h][:, None] * d[h]
            fr = pt - np.floor(pt + 1e-9)
            a1 = fr[np.arange(len(h)), (axis + 1) % 3]
            a2 = fr[np.arange(len(h)), (axis + 2) % 3]
            e = np.minimum(np.minimum(a1, 1 - a1), np.minimum(a2, 1 - a2))
            shade = shade * np.where((e < 0.07) & ~isglow, 0.86, 1.0)
        img[h] = col * shade[:, None]
        glow[h] = np.where(isglow[:, None], col, 0)
    img = img.reshape(ny_, nx_, 3)
    glow = glow.reshape(ny_, nx_, 3)
    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    if bloom:
        g = Image.fromarray(glow.astype(np.uint8)).filter(ImageFilter.GaussianBlur(sc * 0.9))
        out = Image.fromarray(np.clip(np.array(out, float) + 0.85 * np.array(g, float), 0, 255).astype(np.uint8))
    if ss > 1:
        out = out.resize((nx_ // ss, ny_ // ss), Image.LANCZOS)
    return out


render = render_rt  # planche() utilise desormais le rendu exact
