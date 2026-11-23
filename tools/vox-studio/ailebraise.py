"""Ailebraise revu (planche Magmadrake style 2, n. 9) : wyverne de lave.
Debout sur deux pattes, penchee vers l'avant, ailes repliees dont les poignets montent
au-dessus de la tete. Plus de ventre creme, plus de bout de queue enflamme."""
import numpy as np
from voxlib import Model, hexrgb, EYE

PALETTE = {
    1: hexrgb("#24181B"),  # dessous
    2: hexrgb("#4A2C2B"),  # corps (brun-rouge Magmadrake, assombri)
    3: hexrgb("#6E3E33"),  # croute du dessus
    4: hexrgb("#D9C3A0"),  # corne / griffes / os d'aile
    5: hexrgb("#C2461C"),  # membrane d'aile
    240: hexrgb("#FF3D00"), 241: hexrgb("#FF6A00"), 242: hexrgb("#FFB300"),
    248: hexrgb("#FFD02A"),
    250: hexrgb("#4A2C2B"), 251: hexrgb("#6E3E33"), 252: hexrgb("#D9C3A0"),
    253: hexrgb("#4A2C2B"), 254: hexrgb("#6E3E33"), 255: hexrgb("#D9C3A0"),
}
B, H, MEM = 2, 4, 5


def membrane(m, quad, color, thick=0.95):
    """Remplit une voile plane (4 points, x lateral miroir) d'epaisseur ~2 voxels."""
    x, y, z = m._grid()
    for sgn in (1, -1):
        P = [np.array((m.cx + sgn * p[0], p[1], p[2]), float) for p in quad]
        n = np.cross(P[1] - P[0], P[3] - P[0]); n /= np.linalg.norm(n)
        e1 = (P[1] - P[0]) / np.linalg.norm(P[1] - P[0]); e2 = np.cross(n, e1)
        rel = np.stack([x - P[0][0], y - P[0][1], z - P[0][2]], -1)
        dist = np.abs(rel @ n)
        u, v = rel @ e1, rel @ e2
        poly = [((p - P[0]) @ e1, (p - P[0]) @ e2) for p in P]
        inside = np.zeros(x.shape, bool)
        j = len(poly) - 1
        for i in range(len(poly)):
            xi, yi = poly[i]; xj, yj = poly[j]
            cond = ((yi > v) != (yj > v)) & (u < (xj - xi) * (v - yi) / ((yj - yi) or 1e-9) + xi)
            inside ^= cond
            j = i
        msk = inside & (dist <= thick) & (m.v == 0)
        m.v[msk] = color


def build():
    m = Model(20, 30, 31)
    cx = m.cx
    c = int(cx)
    # pattes arriere puissantes
    m.ellipsoid((3.6, 16, 11), (2.6, 3.6, 4.0), B, mirror=True)                # cuisses
    m.capsule((4.0, 16.5, 9), (4.6, 19, 4.2), 2.1, 1.7, B, mirror=True)
    m.capsule((4.6, 19, 4.2), (4.6, 16, 1.6), 1.7, 1.6, B, mirror=True)
    m.box(2, 7, 12, 18, 0, 2, B, mirror=True)
    m.box(2, 7, 11, 12, 0, 1, H, mirror=True)
    # tronc penche vers l'avant, poitrail haut
    m.capsule((cx, 19, 13.5), (cx, 10.5, 16.5), 4.3, 4.8, B)
    m.ellipsoid((cx, 10.5, 16), (4.0, 3.4, 4.2), B)
    # cou en S, tete haute et projetee
    m.capsule((cx, 10, 19.5), (cx, 7.5, 23), 3.2, 2.7, B)
    m.capsule((cx, 7.5, 23), (cx, 6.5, 24.5), 2.7, 2.6, B)
    m.box(c - 2, c + 2, 0, 7, 21, 23, B)          # machoire
    m.box(c - 2, c + 2, 0, 6, 23, 24, 240)        # fente de lave
    m.box(c - 2, c + 2, 0, 7, 24, 26, B)          # museau
    m.box(c - 3, c + 3, 3, 9, 24, 29, B)          # crane
    m.box(1, 4, 2, 5, 28, 30, B, mirror=True)     # arcade
    m.box(1, 3, 3, 4, 26, 28, EYE, mirror=True)
    m.box(1, 2, 0, 1, 22, 24, H, mirror=True)     # crocs
    # cornes de magma couchees vers l'arriere
    m.capsule((2.0, 7.5, 29), (3.0, 10.5, 30.2), 1.1, 0.9, H, mirror=True)
    m.capsule((3.0, 10.5, 30.2), (3.6, 13.5, 30.2), 0.9, 0.8, H, mirror=True)

    # ailes repliees : os du bras (epaule -> poignet haut), doigts (poignet -> bas/arriere)
    sh, wr = (3.6, 11.5, 18.5), (8.4, 15.0, 29.0)
    tip, mid, root = (8.8, 27.0, 10.5), (8.6, 22.0, 14.5), (3.4, 20.5, 15.5)
    m.capsule(sh, wr, 1.5, 1.2, 3, mirror=True)
    m.capsule(wr, tip, 1.0, 0.75, 3, mirror=True)
    m.capsule(wr, mid, 0.9, 0.75, 3, mirror=True)
    membrane(m, [sh, wr, tip, root], MEM)
    m.capsule((8.4, 15.0, 29.0), (8.4, 14.2, 30.6), 0.9, 0.8, H, mirror=True)  # griffe du poignet

    # queue longue et basse, en contrepoids
    m.capsule((cx, 18, 12.5), (cx, 23, 10), 3.0, 2.3, B)
    m.capsule((cx, 23, 10), (cx, 29.4, 9.5), 2.3, 1.2, B)
    # piques le long du dos (deux rangees)
    for lat, yy, zz, hgt in [(1.6, 9, 24.5, 1.6), (1.8, 12, 21.6, 1.8), (1.8, 15, 18.6, 1.6),
                             (1.4, 19, 16.4, 1.4), (1.2, 23.5, 12.8, 1.3)]:
        m.capsule((lat, yy, zz), (lat + 0.3, yy + 1.2, zz + hgt), 0.95, 0.8, 3, mirror=True)

    up = m.neighbors_empty(0, 0, 1)
    down = m.neighbors_empty(0, 0, -1)
    m.recolor(up, [B], 3)
    m.recolor(down, [B], 1)
    body = [1, 2, 3]
    x, y, z = m._grid()
    # lave : poitrail fissure (remplace le ventre creme), dos, nervures d'aile
    m.crack([(0.5, 7.5, 13.5), (1.6, 7.4, 16.5), (3.0, 8.4, 19.5)], 241, frm=body)
    m.crack([(0.5, 7.4, 15.5), (0.5, 7.6, 18)], 242, radius=0.9, frm=body + [241])
    m.crack([(0.5, 8, 25.5), (0.5, 12, 22.5), (0.5, 17, 18.5), (0.5, 22, 14), (0.5, 29, 12)], 241,
            radius=0.8, frm=body)
    m.crack([(8.4, 15.0, 29.0), (6.4, 21, 18), (4.2, 23, 14.5)], 240, radius=0.7, frm=[MEM])
    m.crack([(8.4, 15.0, 29.0), (7.2, 18, 23), (5.0, 17.5, 19)], 240, radius=0.6, frm=[MEM])
    horn = m.v == H
    m.v[horn & (y > 11) & (z > 29.5)] = 241

    legs = (z < 8.5) & (np.abs(x - cx) > 1.6) & (y > 9) & (y < 20.8)
    m.legs_split(legs, {2: (250, 253), 1: (250, 253), 3: (251, 254), 4: (252, 255)})
    assert not ((m.v >= 240) & (m.v <= 247) & legs).any()
    m.crop()
    return m


if __name__ == "__main__":
    from voxlib import write_vox, planche
    m = build()
    print(m.report("Ailebraise (wyverne)", PALETTE))
    write_vox(m, "out/ailebraise-wyverne.vox", PALETTE)
    planche(m, PALETTE, "Ailebraise revu (wyverne)", "Magmadrake style 2 n° 9 — ailes en guise de bras",
            "out/ailebraise-wyverne.png")
