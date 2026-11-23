"""Test « Pixel 3D » sur le Calcinarque legendaire.
A : meme resolution, chaque voxel tire une nuance au hasard (texture granuleuse) -> compatible chargeur.
B : resolution x2 (chaque voxel -> 2x2x2) + nuances -> blocs textures facon style 5, mais 54 voxels de haut."""
import colorsys
import numpy as np
from voxlib import Model, write_vox, planche, hexrgb
import calcinarque_legendaire as cl

rng_seed = 7


def shade(rgb, f):
    h, l, s = colorsys.rgb_to_hls(*[c / 255 for c in rgb])
    return tuple(int(round(c * 255)) for c in colorsys.hls_to_rgb(h, max(0, min(1, l * f)), s))


def pixelize(m, pal):
    pal = dict(pal)
    # nuances : indice de base -> liste d'indices (base + variantes)
    groups = {1: [1, 6], 2: [2, 7, 8], 3: [3, 9, 10], 4: [4, 11]}
    pal[6] = shade(pal[1], 1.35)
    pal[7] = shade(pal[2], 0.82); pal[8] = shade(pal[2], 1.2)
    pal[9] = shade(pal[3], 0.85); pal[10] = shade(pal[3], 1.18)
    pal[11] = shade(pal[4], 0.85)
    # pattes : 3 indices seulement par cote -> 250 basalte, 251 basalte clair, 252 croute
    for base in (250, 253):
        pal[base] = pal[2]; pal[base + 1] = pal[8]; pal[base + 2] = pal[3]
    rng = np.random.default_rng(rng_seed)
    v = m.v
    out = v.copy()
    noise = rng.random(v.shape)
    # bruit symetrique pour garder la symetrie gauche/droite
    noise = np.minimum(noise, noise[::-1])
    noise = (noise - noise.min()) / (noise.max() - noise.min())
    for base, opts in groups.items():
        msk = v == base
        k = np.minimum((noise * len(opts)).astype(int), len(opts) - 1)
        out[msk] = np.array(opts)[k[msk]]
    lava = v == 241
    out[lava & (noise < 0.25)] = 240
    out[lava & (noise > 0.8)] = 242
    for lbase in (250, 253):
        msk = v == lbase
        out[msk & (noise > 0.66)] = lbase + 1
        msk = v == lbase + 1
        out[msk] = lbase + 2  # croute des pattes
    m.v = out
    return pal


def upscale2(m):
    m2 = Model(m.w * 2, m.l * 2, m.h * 2)
    m2.v = m.v.repeat(2, 0).repeat(2, 1).repeat(2, 2)
    return m2


if __name__ == "__main__":
    a = cl.build()
    pal_a = pixelize(a, cl.PALETTE)
    print(a.report("Pixel 3D A (meme resolution)", pal_a))
    write_vox(a, "out/calcinarque-legendaire-pixel3d.vox", pal_a)
    planche(a, pal_a, "Pixel 3D — même résolution", "même modèle, une nuance au hasard par voxel (compatible chargeur)",
            "out/pixel3d-A.png")

    b = upscale2(cl.build())
    pal_b = pixelize(b, cl.PALETTE)
    # vider l'interieur (invisible) pour limiter le poids
    inner = ~b.surface() & (b.v > 0)
    full = int((b.v > 0).sum())
    b.v[inner] = 0
    print(b.report("Pixel 3D B (x2)", pal_b), f"\n(voxels avant evidage : {full})")
    write_vox(b, "out/calcinarque-legendaire-pixel3d-x2.vox", pal_b)
    planche(b, pal_b, "Pixel 3D — résolution ×2", "chaque voxel coupé en 8, nuances au hasard (54 voxels de haut)",
            "out/pixel3d-B.png")
