"""Coureur de Cendres (planche Calcinarque n. 10) : forme intermediaire, fine et nerveuse, basse sur pattes."""
import numpy as np
from voxlib import Model, EYE
from calcinarque_legendaire import PALETTE

B, H = 2, 4


def build():
    m = Model(14, 32, 20)
    cx = m.cx
    c = int(cx)
    # tronc allonge, epaules un peu plus hautes que les hanches
    m.ellipsoid((cx, 11, 12), (4.8, 5.0, 4.0), B)
    m.ellipsoid((cx, 8, 10), (3.4, 3.0, 3.4), B)
    m.ellipsoid((cx, 16.5, 11), (3.3, 5.0, 3.0), B)
    m.ellipsoid((cx, 21, 11.5), (3.9, 3.8, 3.6), B)
    m.ellipsoid((2.7, 21.5, 10), (2.0, 3.2, 3.3), B, mirror=True)
    # cou et tete basse, tendue vers l'avant
    m.capsule((cx, 10, 13), (cx, 5.5, 11), 3.0, 2.6, B)
    m.box(c - 2, c + 2, 0, 7, 6, 8, B)          # machoire
    m.box(c - 2, c + 2, 0, 6, 8, 9, 240)        # fente de lave
    m.box(c - 2, c + 2, 0, 7, 9, 11, B)         # museau
    m.box(c - 3, c + 3, 3, 8, 9, 14, B)         # crane
    m.box(1, 4, 2, 5, 13, 15, B, mirror=True)   # arcade
    m.box(1, 3, 3, 4, 11, 13, EYE, mirror=True)
    m.box(1, 2, 0, 1, 7, 9, H, mirror=True)     # crocs
    # petites cornes couchees vers l'arriere
    m.capsule((2.0, 6.5, 14), (3.0, 9.5, 15.5), 1.05, 0.85, H, mirror=True)
    m.capsule((3.0, 9.5, 15.5), (3.4, 12, 16.2), 0.85, 0.75, H, mirror=True)
    # pattes fines, coudes sortis
    m.capsule((3.4, 11, 10), (5.0, 12, 6), 2.0, 1.8, B, mirror=True)
    m.capsule((5.0, 12, 6), (5.0, 9, 1.6), 1.8, 1.6, B, mirror=True)
    m.box(3, 7, 7, 11, 0, 2, B, mirror=True)
    m.box(3, 7, 6, 7, 0, 1, H, mirror=True)
    m.capsule((3.4, 21, 8.5), (4.2, 24.5, 4), 1.9, 1.6, B, mirror=True)
    m.capsule((4.2, 24.5, 4), (4.4, 22.5, 1.5), 1.6, 1.5, B, mirror=True)
    m.box(3, 6, 20, 24, 0, 2, B, mirror=True)
    m.box(3, 6, 19, 20, 0, 1, H, mirror=True)
    # longue queue relevee
    m.capsule((cx, 24, 12), (cx, 28, 13), 2.3, 1.7, B)
    m.capsule((cx, 28, 13), (cx, 31.4, 16), 1.7, 1.15, B)
    # piques basses en deux rangees
    for lat, y, z, hgt in [(1.6, 8.5, 15.2, 1.6), (2.0, 11.5, 15.6, 2.0), (1.8, 14.5, 14.0, 1.6),
                           (1.8, 19.5, 14.4, 1.6), (1.4, 23.5, 14.0, 1.4)]:
        m.capsule((lat, y, z), (lat + 0.3, y + 1.2, z + hgt), 0.95, 0.8, 3, mirror=True)

    up = m.neighbors_empty(0, 0, 1)
    down = m.neighbors_empty(0, 0, -1)
    m.recolor(up, [B], 3)
    m.recolor(down, [B], 1)
    body = [1, 2, 3]
    x, y, z = m._grid()
    # ligne dorsale continue jusqu'au bout de la queue + rayures de flanc
    m.crack([(0.5, 7, 15), (0.5, 11, 16), (0.5, 16, 14), (0.5, 21, 15),
             (0.5, 26, 14.6), (0.5, 31.5, 17)], 241, radius=0.8, frm=body)
    for y0 in (10.0, 14.5, 19.0):
        m.crack([(3.0, y0, 14.5), (4.4, y0 + 1.6, 11.0)], 241, radius=0.7, frm=body)
    # pas de bout de queue incandescent : trop proche d un starter feu connu
    horn = m.v == H
    m.v[horn & (y > 10.5) & (z > 14)] = 241

    legs = (z < 7.0) & (np.abs(x - cx) > 2.1) & (y > 5.5)
    m.legs_split(legs, {2: (250, 253), 1: (250, 253), 3: (251, 254), 4: (252, 255)})
    assert not ((m.v >= 240) & (m.v <= 247) & legs).any()
    m.crop()
    return m


if __name__ == "__main__":
    from voxlib import write_vox, planche
    m = build()
    print(m.report("Coureur de Cendres", PALETTE))
    write_vox(m, "out/coureur-cendres.vox", PALETTE)
    planche(m, PALETTE, "Coureur de Cendres", "planche Calcinarque n° 10 — forme intermédiaire",
            "out/coureur-cendres.png", combat_px=48)
