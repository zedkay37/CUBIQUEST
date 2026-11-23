"""Calcinarque legendaire : silhouette du 10 (Coureur de Cendres), fissures du 14 (Colosse Obsidien),
cornes du 13 (Alpha Volcanique). Quadrupede de basalte, posture de chasse basse, sans ailes."""
import numpy as np
from voxlib import Model, hexrgb, EYE

PALETTE = {
    1: hexrgb("#1F1B1E"),  # charbon (dessous)
    2: hexrgb("#41372F"),  # basalte (corps)
    3: hexrgb("#6E5B4C"),  # croute de cendre (dessus)
    4: hexrgb("#D2BFA6"),  # corne / griffes / crocs
    240: hexrgb("#FF3D00"), 241: hexrgb("#FF6A00"), 242: hexrgb("#FFB300"),
    248: hexrgb("#FFD02A"),
    250: hexrgb("#41372F"), 251: hexrgb("#6E5B4C"), 252: hexrgb("#D2BFA6"),
    253: hexrgb("#41372F"), 254: hexrgb("#6E5B4C"), 255: hexrgb("#D2BFA6"),
}
B, H = 2, 4


def head(m, top=17):
    c = int(m.cx)
    # machoire inferieure, plus longue que le museau : elle avance
    m.box(-3 + c, 3 + c, 1, 9, 9, 11, B)
    m.box(-2 + c, 2 + c, 0, 1, 9, 11, B)
    # fente de lave (gueule entrouverte)
    m.box(-3 + c, 3 + c, 0, 8, 11, 12, 240)
    # museau superieur, en marche d'escalier vers l'avant
    m.box(-3 + c, 3 + c, 0, 9, 12, 14, B)
    m.box(-2 + c, 2 + c, 1, 5, 14, 15, B)
    # crane
    m.box(-4 + c, 4 + c, 4, 10, 12, top, B)
    # arcade sourciliere en surplomb, coupee au milieu
    m.box(1, 5, 3, 7, top - 1, top + 1, B, mirror=True)
    # yeux enfonces sous l'arcade, sur la face avant du crane
    m.box(2, 4, 4, 5, top - 3, top - 1, EYE, mirror=True)
    # crocs de corne qui descendent sur la fente
    m.box(2, 3, 0, 1, 10, 12, H, mirror=True)
    # muscles de machoire
    m.ellipsoid((3.8, 8, 11.5), (1.6, 2.6, 2.4), B, mirror=True)


def build():
    m = Model(20, 34, 30)
    cx = m.cx

    # --- tronc : masse a l'avant, epaules = point le plus haut ---
    m.ellipsoid((cx, 12.5, 17), (7.0, 5.5, 5.5), B)               # epaules
    m.ellipsoid((3.6, 12, 19), (3.6, 4.4, 4.0), B, mirror=True)   # bosses d'epaule
    m.ellipsoid((cx, 9.5, 13.5), (4.8, 3.6, 4.6), B)              # poitrail etroit (V)
    m.ellipsoid((cx, 18, 14), (4.4, 5.0, 4.0), B)                 # taille
    m.ellipsoid((cx, 23, 15), (5.2, 4.2, 4.4), B)                 # arriere-train, plus bas
    m.ellipsoid((3.8, 23.5, 13), (2.8, 4.0, 4.4), B, mirror=True) # cuisses
    # plaques de basalte (14)
    m.box(3, 8, 9, 15, 19, 22, B, mirror=True)
    m.box(3, 7, 20, 25, 16, 19, B, mirror=True)

    # --- cou puissant, descend vers la tete ---
    m.capsule((cx, 12, 18.5), (cx, 7, 15), 4.4, 3.8, B)
    head(m)

    # --- cornes (13) : longues, balayees vers l'arriere puis vers le haut ---
    m.capsule((2.8, 8.0, 17), (4.6, 9.8, 21.0), 1.5, 1.25, H, mirror=True)
    m.capsule((4.6, 9.8, 21.0), (5.8, 12.6, 24.0), 1.25, 1.05, H, mirror=True)
    m.capsule((5.8, 12.6, 24.0), (6.2, 16.0, 25.6), 1.05, 0.85, H, mirror=True)

    # --- piques : deux rangees laterales courtes et irregulieres ---
    for lat, y, z, hgt in [(2.2, 9.5, 20.5, 2.6), (3.2, 12, 22.5, 3.4), (2.6, 14.5, 22.3, 2.6),
                           (3.4, 17, 19.6, 2.0), (2.4, 21, 19.3, 2.2), (3.0, 23.5, 19, 1.6)]:
        m.capsule((lat, y, z), (lat + 0.5, y + 1.5, z + hgt), 1.2, 0.9, 3, mirror=True)

    # --- pattes avant : coudes vers l'exterieur ---
    m.capsule((5.0, 12, 14), (7.6, 13, 8.5), 2.9, 2.5, B, mirror=True)   # bras
    m.capsule((7.6, 13, 8.5), (7.6, 10, 2.2), 2.5, 2.1, B, mirror=True)  # avant-bras
    m.box(5, 10, 7, 12, 0, 2, B, mirror=True)                            # patte
    m.box(5, 10, 6, 7, 0, 1, H, mirror=True)                             # griffes
    # --- pattes arriere : genou avant, jarret arriere ---
    m.capsule((5.0, 22, 11), (6.2, 26, 5), 2.5, 2.0, B, mirror=True)
    m.capsule((6.2, 26, 5), (6.4, 24, 1.8), 2.0, 1.8, B, mirror=True)
    m.box(4, 9, 21, 26, 0, 2, B, mirror=True)
    m.box(4, 9, 20, 21, 0, 1, H, mirror=True)

    # --- queue : epaisse a la base, s'affine et se releve ---
    m.capsule((cx, 26, 15.5), (cx, 30, 16.5), 3.0, 2.2, B)
    m.capsule((cx, 30, 16.5), (cx, 33.3, 19), 2.2, 1.3, B)
    for y, z in [(27.5, 18.2), (30.5, 18.4)]:
        m.capsule((1.5, y, z), (1.8, y + 1.2, z + 1.5), 1.0, 0.8, 3, mirror=True)

    # --- passes de couleur ---
    up = m.neighbors_empty(0, 0, 1)
    down = m.neighbors_empty(0, 0, -1)
    m.recolor(up, [B], 3)
    m.recolor(down, [B], 1)

    body = [1, 2, 3]
    x, y, z = m._grid()
    # fissures de lave (14)
    m.crack([(0.5, 6.0, 9.5), (2.0, 6.6, 12.5), (3.6, 7.6, 16)], 241, frm=body)            # poitrail en V
    m.crack([(7.0, 10, 19.5), (7.4, 13, 16.5), (6.8, 16, 13)], 241, frm=body)               # epaule
    m.crack([(4.6, 17, 16.5), (5.2, 19.5, 14.5), (5.6, 22.5, 15.5), (6.2, 25, 13.5)], 241, frm=body)  # flanc
    m.crack([(0.5, 8, 21), (0.5, 12.5, 23.2), (0.5, 17, 19.5), (0.5, 22, 20),
             (0.5, 27, 18.8), (0.5, 33, 20.5)], 241, radius=0.85, frm=body)                 # ligne dorsale
    m.crack([(0.5, 11, 23.3), (0.5, 14, 23.3)], 242, radius=0.9, frm=[241])                 # coeur chaud
    m.crack([(0.5, 6.0, 9.5), (1.5, 6.3, 11.5)], 242, radius=0.9, frm=[241])
    # cornes : base d'os, moitie exterieure incandescente
    horn = m.v == H
    m.v[horn & (y > 11.5) & (z > 22)] = 241
    m.v[horn & (y > 14.6) & (z > 24)] = 242

    # pattes -> indices animes
    legs = (z < 9.0) & (np.abs(x - cx) > 3.1) & (y > 5.5)
    m.legs_split(legs, {2: (250, 253), 1: (250, 253), 3: (251, 254), 4: (252, 255)})
    assert not ((m.v >= 240) & (m.v <= 247) & legs).any(), "lave sur une patte"
    m.crop()
    return m


if __name__ == "__main__":
    from voxlib import write_vox, planche
    m = build()
    print(m.report("Calcinarque legendaire", PALETTE))
    write_vox(m, "out/calcinarque-legendaire.vox", PALETTE)
    planche(m, PALETTE, "Calcinarque légendaire", "10 (silhouette) + 14 (fissures) + 13 (cornes)",
            "out/calcinarque-legendaire.png")
