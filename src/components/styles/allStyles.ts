/**
 * Les vingt styles de Magmadrake (A à F : sprint STYLES ; G à T : sprint STYLES2), pour la page `?gallery=styles`.
 */
import { STYLE_LIST, buildStyle, type StyleId, type StyledModel } from './magmaStyles';
import { STYLE2_LIST, buildStyle2, type Style2Id } from './magmaStyles2';

export type AnyStyleId = StyleId | Style2Id;
export interface StyleInfo {
  id: AnyStyleId;
  name: string;
  note: string;
  risk: string;
}

export const ALL_STYLES: StyleInfo[] = [...STYLE_LIST.map((s) => ({ ...s, risk: 'Sprint STYLES' })), ...STYLE2_LIST];

export function buildAnyStyle(id: AnyStyleId): StyledModel {
  return (STYLE_LIST.some((s) => s.id === id) ? buildStyle(id as StyleId) : buildStyle2(id as Style2Id));
}
