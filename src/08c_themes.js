/* A pending theme constrains new draws; it never replans existing subtitles.
   Theme/mood mappings follow upstream, with this fork's 30fps motion cadence. */
(() => {
'use strict';
J.THEMES = {
  lyricpv: { name: '文字PV', en: 'Lyric video', moods: ['editorial', 'graphic', 'emotional'], set: 'typo' },
  kinetic: { name: 'キネティック', en: 'Kinetic', moods: ['pop', 'graphic', 'glitch'], set: 'kinetic' },
  wa: { name: '和風', en: 'Japanese', moods: ['calm', 'emotional', 'editorial'], wa: true },
  horror: { name: 'ホラー', en: 'Horror', moods: ['horror'], set: 'horror' },
  pop: { name: 'ポップ', en: 'Pop', moods: ['pop'] },
  ballad: { name: 'バラード', en: 'Ballad', moods: ['calm', 'emotional'], koma: [0, 0, 15] },
};
J.normalizeTheme = value => typeof value === 'string' && Object.hasOwn(J.THEMES, value) ? value : '';
J.themeSwitches = theme => {
  const T = J.THEMES[J.normalizeTheme(theme)];
  return { ...(T?.set ? { [T.set]: true } : {}), ...(T?.wa ? { wa: true, extra: true } : {}) };
};
})();
