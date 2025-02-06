/**
 * Method for checking if line only has chords and dividers.
 *
 * @param {string} line
 * @returns
 */
const isLineWithOnlyChords = (line) => {
  const items = line.replace(/ +/, ' ').trim().split(' ');
  for (let i = 0; i < items.length; i++) {
    let chord = items[i];
    if (!(chord.startsWith('[') && chord.endsWith(']'))) return false;
  }
  return true;
};

/**
 * Method for creating a new song object from template.
 *
 * @param {string} template
 * @param {boolean} bypassMeta - false by default
 */
const newSongObjectFromTemplate = (template, bypassMeta = false) => {
  template = template.trim();

  const brakcetRegex = /\[([^\]]*)\]/;
  const lineHasSquareBrackets = (line) => line.match(brakcetRegex);

  let meta_section_passed = bypassMeta;
  let initialized = false;

  let renderCallback = Function();

  /**
   * @param {Function} callback
   */
  const setRenderCallback = (callback) => {
    renderCallback = callback;
    renderCallback();
  };

  /* Object contents */
  const displayType = { type: DISPLAY_CHORDS, nashvilleUseFlat: true };
  const sections = [];
  const transposeLogic = {
    useH: true,
    transposeStep: 0,
    capoStep: 0,
    keyIsMinor: undefined,
    key: undefined,
    keys: undefined,
    originalKeyObject: undefined,
    currentKeyObject: undefined,
    /**
     * Method for getting key object matching string key.
     *
     * @param {string} key
     * @returns key object
     */
    getKeyObjectFromKeyString: (key) =>
      transposeLogic.keys.find((x) => x.variants.indexOf(key) !== -1),
    /**
     * Method for updating transpose logic objects currenct key object.
     *
     * @returns null if no success
     */
    updateCurrentKeyObject: () => {
      const originalIndex = transposeLogic.originalKeyObject.listIndex;
      if (originalIndex === -1) throw new Error('Could not find key.');
      const newListIndex = modifiedModulo(
        originalIndex + transposeLogic.transposeStep + transposeLogic.capoStep,
        transposeLogic.keys.length
      );
      const transposedKeyObject = transposeLogic.keys[newListIndex];
      transposeLogic.currentKeyObject = transposedKeyObject;
    },
    /**
     * Method for setting key in transpose logic object.
     *
     * @param {string} key
     */
    setKey: (key) => {
      transposeLogic.key = key;
      keyIsMinor = key.endsWith('m');
      transposeLogic.keys = keyIsMinor ? keyObjects.minor : keyObjects.major;
      transposeLogic.originalKeyObject = transposeLogic.getKeyObjectFromKeyString(key);
      transposeLogic.currentKeyObject = transposeLogic.originalKeyObject;
      transposeLogic.updateCurrentKeyObject();
    },

    getDisplayKey: () => {
      if (!transposeLogic.capoStep) return transposeLogic.currentKeyObject.key;

      const originalIndex = transposeLogic.originalKeyObject.listIndex;
      const newListIndex = modifiedModulo(
        transposeLogic.transposeStep + originalIndex,
        transposeLogic.keys.length
      );
      const transposedKeyObject = transposeLogic.keys[newListIndex];
      return transposedKeyObject.key;
    },

    getDisplayCapo: () => {
      const originalKeyObject = transposeLogic.originalKeyObject;
      if (!originalKeyObject) {
        console.error('Cannot get display capo. OriginalKeyObject not set.');
        return;
      }

      const newListIndex = modifiedModulo(
        originalKeyObject.listIndex + transposeLogic.capoStep,
        transposeLogic.keys.length
      );

      const transposedKeyIndex = transposeLogic.keys[newListIndex]?.index;

      const actualCapoStep = modifiedModulo(
        transposedKeyIndex - originalKeyObject.index,
        noteObjectList.length
      );

      return actualCapoStep;
    },

    transposeTo: (to = 0) => {
      transposeLogic.transposeStep = to;
      transposeLogic.updateCurrentKeyObject();
    },

    transposeReset: () => transposeLogic.transposeTo(0),

    transposeUp: (by = 1) => {
      transposeLogic.transposeStep +=
        transposeLogic.transposeStep < transposeLogic.keys.length
          ? by
          : by - transposeLogic.keys.length;
      transposeLogic.updateCurrentKeyObject();
    },

    transposeDown: (by = 1) => {
      transposeLogic.transposeStep -=
        transposeLogic.transposeStep < -transposeLogic.keys.length
          ? by - transposeLogic.keys.length
          : by;
      transposeLogic.updateCurrentKeyObject();
    },

    capoTo: (to = 0) => {
      transposeLogic.capoStep = to;
      transposeLogic.updateCurrentKeyObject();
    },

    capoReset: () => transposeLogic.capoTo(0),

    capoUp: (by = 1) => {
      if (transposeLogic.capoStep < transposeLogic.keys.length - 1) transposeLogic.capoStep += by;
      transposeLogic.updateCurrentKeyObject();
    },

    capoDown: (by = 1) => {
      transposeLogic.capoStep -= by;
      if (transposeLogic.capoStep < 0) transposeLogic.capoStep = 0;
      transposeLogic.updateCurrentKeyObject();
    },

    setDisplayH: (displayH) => {
      transposeLogic.useH = displayH;
    },
  };
  const metadata = {
    title: undefined,
    artist: undefined,
    tempo: undefined,
    time: undefined,
    published: undefined,
    web: undefined,
    copyright: undefined,
    album: undefined,
    extra: new Map(),
  };

  const newSection = (title = null) => sections.push({ title, lines: [] });

  const getCurrentSection = () => {
    if (sections.length === 0) newSection();
    return sections[sections.length - 1];
  };

  const transposeTo = (to = 0) => {
    transposeLogic.transposeTo(to);
    renderCallback();
  };
  const transposeReset = () => transposeTo(0);
  const transposeUp = (by = 1) => {
    transposeLogic.transposeUp(by);
    renderCallback();
  };
  const transposeDown = (by = 1) => {
    transposeLogic.transposeDown(by);
    renderCallback();
  };

  const capoTo = (to = 0) => {
    transposeLogic.capoTo(to);
    renderCallback();
  };
  const capoReset = () => capoTo(0);
  const capoUp = (by = 1) => {
    transposeLogic.capoUp(by);
    renderCallback();
  };
  const capoDown = (by = 1) => {
    transposeLogic.capoDown(by);
    renderCallback();
  };

  const displayChords = () => {
    displayType.type = DISPLAY_CHORDS;
    renderCallback();
  };
  const displayLyrics = () => {
    displayType.type = DISPLAY_LYRICS;
    renderCallback();
  };
  const displayNashville = (useFlat = true) => {
    displayType.type = DISPLAY_NASHVILLE;
    displayType.nashvilleUseFlat = useFlat;
    renderCallback();
  };
  const displaySolfege = () => {
    displayType.type = DISPLAY_SOLFEGE;
    renderCallback();
  };
  const setDisplayH = (displayH) => {
    transposeLogic.setDisplayH(displayH);
    renderCallback();
  };

  template
    .trim()
    .split('\n')
    .forEach((line, linenum) => {
      /* Is one line */
      if (isLineWithOnlyChords(line)) {
        const type = ONLY_CHORDS_LINE;
        const elements = [];

        for (chordElement of line.replace(/ +/, ' ').trim().split(' ')) {
          let type; // CHORD | DIVIDER
          let word;
          try {
            word = newChordObjectFromString(
              chordElement.substring(1, chordElement.length - 1),
              transposeLogic
            );
            type = CHORD_LINE_CHORD;
          } catch (error) {
            word = chordElement.substring(1, chordElement.length - 1);
            type = CHORD_LINE_DIVIDER;
          }

          elements.push({ word, type });
        }

        /* Push line to current sections lines[] */
        getCurrentSection().lines.push({ type, elements });
      } /* Line has chords and lyrics */ else if (lineHasSquareBrackets(line)) {
        const type = CHORDS_AND_LYRICS_LINE;
        const pairs = [];

        const elementArray = line.split(brakcetRegex);
        for (let i = 0; i < elementArray.length; i += 2) {
          let chord = elementArray[i - 1] ?? null;
          let lyrics = elementArray[i];

          if (!chord && !lyrics) continue;

          // WARN - may fail if not chord. What to do if fails
          try {
            if (chord) chord = newChordObjectFromString(chord, transposeLogic);
          } catch (error) {
            console.warn('Could not read chord [' + chord + '].');
            // TODO - handle no chord found on wp using chord === undefined
            chord = undefined;
          }

          pairs.push({ chord, lyrics });
        }

        getCurrentSection().lines.push({ type, pairs });
      } /* Line is blank or not containing chords */ else {
        /* Metadata */
        const metaRegex = /^(key|tempo|time):\s*(.*)/i;
        if (!meta_section_passed && line.match(metaRegex)) {
          const matches = line.match(metaRegex, 'i');

          if (matches.length >= 3) {
            let command = matches[1]?.toUpperCase();
            let text = matches[2];
            if (command == 'KEY') text = text;
            else if (command == 'TEMPO') text = text.split(' ')[0];

            switch (command) {
              case 'KEY':
                if (text.trim() !== '') {
                  transposeLogic.setKey(text.trim());
                  initialized = true;
                }
                break;
              case 'TEMPO':
                metadata.tempo = text;
                break;
              case 'TIME':
                metadata.time = text;
                break;
            }
          }
        } else {
          let LINETYPE;
          if (!meta_section_passed && linenum === 0) LINETYPE = 'SONG_TITLE';
          else if (!meta_section_passed && linenum === 1) LINETYPE = 'SONG_ARTIST';
          else if (line.trim().endsWith(':')) LINETYPE = 'SECTION_START';
          else if (line.trim() === '' && !meta_section_passed) {
            LINETYPE = 'META_END';
            meta_section_passed = true;
          } else if (line.trim() === '') LINETYPE = 'EMPTY';
          else LINETYPE = 'NONE';

          switch (LINETYPE) {
            case 'SONG_TITLE':
              metadata.title = line;
              break;
            case 'SONG_ARTIST':
              metadata.artist = line;
              break;
            case 'META_END':
              break;
            case 'SECTION_START':
              getCurrentSection().title = line;
              break;
            case 'EMPTY':
              meta_section_passed = true;
              // Don't make empty sections
              if (template.split('\n')[linenum - 1].trim() != '') {
                newSection();
              }
              break;
            case 'NONE':
              if (meta_section_passed) {
                getCurrentSection().lines.push({
                  type: LYRCIS_LINE,
                  lyrics: line,
                });
              } else {
                metadata.extra.set(line.split(':')[0].trim(), line.split(':')[1]?.trim() ?? '');
              }
              break;
            default:
              break;
          }
        }
      }
    });

  /* Return song object */
  const song = {
    initialized,
    sections,
    transposeLogic,
    displayType,
    metadata,
    callback: renderCallback,
    setRenderCallback,
    transposeUp,
    transposeReset,
    transposeDown,
    capoReset,
    capoUp,
    capoDown,
    displayChords,
    displayLyrics,
    displayNashville,
    displaySolfege,
    setDisplayH,
  };

  return song;
};

/**
 * Method for showing section object as HTML table.
 *
 * @param {object} sectionObject
 */
const sectionObjectToHtmlTable = (section, displayType) => {
  const sectionBuffer = [];
  if (section.title) sectionBuffer.push(section.title.wrapHTML('div', 'cp-heading'));

  section.lines.forEach((line) => {
    const lineBuffer = [];

    switch (line.type) {
      case ONLY_CHORDS_LINE:
        line.elements.forEach((element) => {
          let word =
            element.type === CHORD_LINE_CHORD
              ? chordObjectToStringBasedOnDisplayType(element.word, displayType)
              : element.word;
          word = word.wrapHTML('span', 'cp-chord');
          lineBuffer.push(word);
        });
        break;

      case CHORDS_AND_LYRICS_LINE:
        const tableBuffer = [];
        for (const pair of line.pairs) {
          const chordObject = pair.chord;
          const lyrics = pair.lyrics;
          chordLine = chordObject
            ? chordObjectToStringBasedOnDisplayType(chordObject, displayType).wrapHTML(
                'span',
                'cp-chord'
              ) + '&nbsp'.repeat(2)
            : '';
          lyricsLine = lyrics ? lyrics.replaceAll(' ', '&nbsp') : '&nbsp';
          const tableCell = (chordLine + '<br>' + lyricsLine).wrapHTML('td');
          tableBuffer.push(tableCell);
        }
        lineBuffer.push(tableBuffer.join('\n').wrapHTML('tr').wrapHTML('tbody').wrapHTML('table'));
        break;

      case LYRCIS_LINE:
        lineBuffer.push(line.lyrics);
        break;
    }
    sectionBuffer.push(lineBuffer.join(' ').wrapHTML('div'));
  });

  return sectionBuffer.join('\n').wrapHTML('div', 'cp-section') + '<br>';
};

/**
 * Method for showing section object as lyrics only string.
 *
 * @param {object} sectionObject
 */
const sectionObjectToLyrics = (section) => {
  const sectionBuffer = [];
  if (section.title) sectionBuffer.push(section.title.wrapHTML('div', 'cp-heading'));

  const linesBuffer = [];
  section.lines.forEach((line) => {
    switch (line.type) {
      case ONLY_CHORDS_LINE:
        break;

      case CHORDS_AND_LYRICS_LINE:
        const lyricsLineBuffer = [];
        for ({ lyrics } of line.pairs) lyricsLineBuffer.push(lyrics);

        linesBuffer.push(lyricsLineBuffer.join(''));
        break;

      case LYRCIS_LINE:
        linesBuffer.push(line.lyrics);
        break;
    }
  });

  if (linesBuffer.length) sectionBuffer.push(linesBuffer.join('<br>'));

  if (sectionBuffer.length) return sectionBuffer.join('\n').wrapHTML('div', 'cp-section') + '<br>';
  else return '';
};

/**
 * Method for showing section object in chord pro format.
 *
 * @param {object} section
 * @returns
 */
const sectionObjectToChordPro = (section, originalString = true, translateHToB = true) => {
  const sectionBuffer = [];
  if (section.title) sectionBuffer.push(section.title);

  section.lines.forEach((line) => {
    const lineBuffer = [];

    switch (line.type) {
      case ONLY_CHORDS_LINE:
        line.elements.forEach((element) => {
          let word =
            element.type === CHORD_LINE_CHORD
              ? originalString
                ? chordObjectToOriginalString(element.word)
                : chordObjectToTransposedString(element.word)
              : element.word;

          /* Translate H to B */
          if (translateHToB && word.startsWith('H')) word = 'B' + word.substr(1);
          word = word.wrapChord();
          lineBuffer.push(word + ' ');
        });
        break;

      case CHORDS_AND_LYRICS_LINE:
        for (const pair of line.pairs) {
          const chordObject = pair.chord;
          const lyrics = pair.lyrics;
          let transposedChord = chordObject
            ? originalString
              ? chordObjectToOriginalString(chordObject)
              : chordObjectToTransposedString(chordObject)
            : '';
          /* Translate H to B */
          if (translateHToB && transposedChord.startsWith('H')) {
            transposedChord = 'B' + transposedChord.substr(1);
          }
          const lyricsString = lyrics ? lyrics : '';
          let lyricsAndBracketedChords =
            (transposedChord ? transposedChord.wrapChord() : '') + lyricsString;

          lineBuffer.push(lyricsAndBracketedChords);
        }

        break;

      case LYRCIS_LINE:
        lineBuffer.push(line.lyrics);
        break;
    }
    sectionBuffer.push(lineBuffer.join(''));
  });

  return sectionBuffer.join('\n') + '\n';
};

/**
 * Method for showing metadata object as HTML.
 *
 * @param {*} metadata
 * @param {*} transposeLogic
 * @returns
 */
const metadataObjectToHtml = (
  metadata,
  transposeLogic,
  displayType,
  includeMetaKeys = undefined
) => {
  /* Metadata start */
  const hideKeyDisplayTypes = [DISPLAY_LYRICS];
  const excludeKey = hideKeyDisplayTypes.indexOf(displayType.type) !== -1;
  const showOriginalKeyDisplayTypes = [DISPLAY_NASHVILLE, DISPLAY_SOLFEGE];
  const showOriginalKey = showOriginalKeyDisplayTypes.indexOf(displayType.type) !== -1;

  const metaBuffer = [];
  const keyTempoBuffer = [];

  if (metadata.title) metaBuffer.push(metadata.title.wrapHTML('div', 'cp-song-title'));
  if (metadata.artist) metaBuffer.push(metadata.artist.wrapHTML('div', 'cp-song-artist'));
  if (!excludeKey) {
    if (!showOriginalKey && transposeLogic.currentKeyObject)
      keyTempoBuffer.push(('Toneart: ' + transposeLogic.getDisplayKey()).wrapHTML('div'));
    if (showOriginalKey && transposeLogic.originalKeyObject)
      keyTempoBuffer.push(
        ('Original toneart: ' + transposeLogic.originalKeyObject.key).wrapHTML('div')
      );
    if (transposeLogic.capoStep)
      keyTempoBuffer.push(('Capo: ' + transposeLogic.getDisplayCapo()).wrapHTML('div'));
  }
  if (metadata.tempo)
    keyTempoBuffer.push((metadata.tempo + ' BPM ' + (metadata.time ?? '')).wrapHTML('div'));

  metaBuffer.push(keyTempoBuffer.join('\n').wrapHTML('div', 'cp-key-tempo-wrapper'));
  for (let [key, value] of metadata.extra) {
    if (includeMetaKeys) {
      if (includeMetaKeys.indexOf(key.toUpperCase()) !== -1) {
        metaBuffer.push((key + ': ' + value).wrapHTML('div'));
      }
    } else {
      metaBuffer.push((key + ': ' + value).wrapHTML('div'));
    }
  }

  return metaBuffer.join('\n').wrapHTML('div', 'cp-meta-wrapper') + '<br>';
};

/**
 * Method for showing metadata in a chord pro format.
 *
 * @param {*} metadata
 * @param {*} transposeLogic
 * @returns
 */
const metadataObjectToChordPro = (metadata, transposeLogic, includeMetaKeys = undefined) => {
  /* Metadata start */
  const metaBuffer = [];
  if (metadata.title) metaBuffer.push(metadata.title);
  if (metadata.artist) metaBuffer.push(metadata.artist);
  if (transposeLogic.currentKeyObject)
    metaBuffer.push('Key: ' + transposeLogic.currentKeyObject.key);
  if (metadata.tempo) metaBuffer.push('Tempo: ' + metadata.tempo);
  if (metadata.time) metaBuffer.push('Time: ' + metadata.time);
  for (let [key, value] of metadata.extra) {
    if (includeMetaKeys) {
      if (includeMetaKeys.indexOf(key.toUpperCase()) !== -1) {
        metaBuffer.push(key + ': ' + value);
      }
    } else {
      metaBuffer.push(key + ': ' + value);
    }
  }

  return metaBuffer.join('\n') + '\n';
};

/**
 * Method for showing song object as HTML table.
 *
 * @param {modsong} songObject
 * @param {boolean} bypassMeta
 */
const songObjectToHtmlTable = (songObject, bypassMeta = false, includeMetaKeys = undefined) => {
  /* Return null if song object is not initialized */
  if (!songObject.initialized) {
    console.error('Failed to display song. Song object is not initialized.');
    return;
  }

  const mainBuffer = [];
  const displayType = songObject.displayType;

  /* Metadata start */
  const metadataString = metadataObjectToHtml(
    songObject.metadata,
    songObject.transposeLogic,
    displayType,
    includeMetaKeys
  );
  mainBuffer.push(metadataString);
  /* Metadata end */

  /* Sections start */
  const sectionsBuffer = [];
  songObject.sections.forEach((section) => {
    const sectionString =
      displayType.type === DISPLAY_LYRICS
        ? sectionObjectToLyrics(section, displayType)
        : sectionObjectToHtmlTable(section, displayType);
    if (sectionString) {
      sectionsBuffer.push(sectionString);
    }
  });
  mainBuffer.push(sectionsBuffer.join('\n').wrapHTML('div', 'cp-song-body'));
  /* Sections end */

  return mainBuffer.join('\n');
};

/**
 * Method for showing song object in a chord pro format.
 *
 * @param {modsong} songObject
 * @param {boolean} bypassMeta
 */
const songObjectToChordPro = (
  songObject,
  originalString = true,
  bypassMeta = false,
  translateHToB = true,
  includeMetaKeys = undefined
) => {
  /* Return null if song object is not initialized */
  if (!songObject.initialized) {
    console.error('Failed to display song. Song object is not initialized.');
    return;
  }

  const mainBuffer = [];

  if (!bypassMeta) {
    /* Metadata start */
    const metadataString = metadataObjectToChordPro(
      songObject.metadata,
      songObject.transposeLogic,
      includeMetaKeys
    );
    mainBuffer.push(metadataString);
    /* Metadata end */
  }

  /* Sections start */
  const sectionsBuffer = [];
  songObject.sections.forEach((section) => {
    const sectionString = sectionObjectToChordPro(section, originalString, translateHToB);
    if (sectionString) {
      sectionsBuffer.push(sectionString);
    }
  });
  mainBuffer.push(sectionsBuffer.join('\n'));

  /* Sections end */

  return mainBuffer.join('\n');
};
