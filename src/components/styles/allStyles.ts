/**
 * Les vingt styles (A à F : sprint STYLES ; G à T : sprint STYLES2), pour la page `?gallery=styles`,
 * appliqués à Magmadrake ou à Calcinarque (sprint STYLES3).
 */
import { STYLE_LIST, buildStyle, type StyleId, type StyledModel } from './magmaStyles';
import { STYLE2_LIST, buildStyle2, type Style2Id } from './magmaStyles2';
import { CALCINARQUE } from './calcinarque';
import { MAGMADRAKE, withSubject, type StyleSubject, type SubjectId } from './subject';

export type AnyStyleId = StyleId | Style2Id;
export interface StyleInfo {
  id: AnyStyleId;
  name: string;
  note: string;
  risk: string;
}

export const ALL_STYLES: StyleInfo[] = [...STYLE_LIST.map((s) => ({ ...s, risk: 'Sprint STYLES' })), ...STYLE2_LIST];
export const SUBJECTS: Record<SubjectId, StyleSubject> = { magmadrake: MAGMADRAKE, calcinarque: CALCINARQUE };

/** Une variante d'une créature : le style est construit avec la finesse relative et la palette de la créature. */
export function buildAnyStyle(id: AnyStyleId, subject: SubjectId = 'magmadrake'): StyledModel {
  return withSubject(SUBJECTS[subject], () => (STYLE_LIST.some((s) => s.id === id) ? buildStyle(id as StyleId) : buildStyle2(id as Style2Id)));
}
