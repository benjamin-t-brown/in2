/*
global
G_display
*/

const BLACK = 'rgba(16, 30, 41, 1)';
// const YELLOW = '#FFCE00';
const YELLOW = '#F47E1B';

const G_ui = {
  Loading() {
    const pct = G_display.numLoaded / G_display.numLoading;
    console.log('LOADING?', pct, G_display.numLoading, G_display.numLoaded);
    const screenSize = 512;
    G_display.drawRect(0, 0, screenSize, screenSize, '#000');
    G_display.drawText('Loading...', 256, 256);
    G_display.drawText(`${(pct * 100).toFixed(0)}%`, 256, 256 + 32);
    G_display.drawRect(32, screenSize - 128, screenSize - 64, 32, YELLOW);
    G_display.drawRect(
      32,
      screenSize - 128,
      pct * (screenSize - 64),
      32,
      '#fff'
    );
  },
  Dialog({
    text,
    leftPortraitSprite,
    leftPortraitLabel,
    rightPortraitSprite,
    rightPortraitLabel,
    speaker,
    visible,
  }) {
    const id = 'Adalais_in_the_arcade_dialog_div';
    const idLeftPortrait = id + '_left';
    const idRightPortrait = id + '_right';
    const idTextArea = id + '_textArea';

    console.log('[standalone] Dialog', {
      text,
      leftPortraitSprite,
      leftPortraitLabel,
      rightPortraitSprite,
      rightPortraitLabel,
      speaker,
      visible,
    });

    const getMainDiv = mainId => {
      let div = document.getElementById(mainId);
      if (!div) {
        div = document.createElement('div');
        div.id = mainId;
        div.style.position = 'relative';
        div.style.width = '512px';
        div.style.height = '128px';
        div.style.background = 'url(res/images/ui-black-bar.png)';
        // div.style.border = '1px solid white';
        div.style.top = '-128px';
        div.style.overflow = 'hidden';
        div.style.display = 'flex';
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.25s linear';
        div.style['box-sizing'] = 'border-box';
        div.style['user-select'] = 'none';
        div.style['justify-content'] = 'center';
        div.style['box-shadow'] = '0px 0px 32px 16px rgba(16, 30, 41, 0.75)';
        G_display.canvas.parentElement.appendChild(div);
      }
      return div;
    };

    const mainDiv = getMainDiv(id);

    const getPortraitAndCanvas = portraitId => {
      let div = document.getElementById(portraitId);
      if (!div) {
        div = document.createElement('div');
        div.id = portraitId;
        div.style.width = '128px';
        div.style.height = '128px';
        div.style.position = 'relative';
        // div.style.overflow = 'hidden';
        div.style.transition =
          'border-top-color 0.15s ease-out, width 0.15s ease-out';
        div.style['box-sizing'] = 'border-box';
        div.style['border-top'] = '2px solid black';
        const nameplate = document.createElement('div');
        nameplate.style.position = 'absolute';
        nameplate.style.padding = '4px';
        nameplate.style.transition =
          'background 0.15s ease-out, color 0.15s ease-out';
        if (portraitId.indexOf('left') > -1) {
          nameplate.style.left = 'calc(100% + 4px)';
        } else {
          nameplate.style.right = 'calc(100% + 4px)';
          nameplate.style['text-align'] = 'right';
        }
        //nameplate.style.top = '-32px';
        // nameplate.style.width = '100%';
        nameplate.style.fontSize = '12px';
        div.appendChild(nameplate);
        const canvas = document.createElement('canvas');
        canvas.width = '128';
        canvas.height = '128';
        canvas.style.transition = 'transform 0.15s ease-out';
        div.appendChild(canvas);
        mainDiv.appendChild(div);
        return [div, canvas, nameplate];
      } else {
        return [div, div.children[1], div.children[0]];
      }
    };
    const getTextArea = textAreaId => {
      let textArea = document.getElementById(textAreaId);
      if (!textArea) {
        textArea = document.createElement('div');
        textArea.id = textAreaId;
        textArea.style.width = `256px`;
        // textArea.style.height = '128px';
        textArea.style.background = BLACK;
        textArea.style.padding = '32px 16px 16px 16px';
        mainDiv.appendChild(textArea);
      }
      return textArea;
    };

    const [leftDiv, leftCanvas, leftNameplate] = getPortraitAndCanvas(
      idLeftPortrait
    );
    const textArea = getTextArea(idTextArea);
    const [rightDiv, rightCanvas, rightNameplate] = getPortraitAndCanvas(
      idRightPortrait
    );
    textArea.innerHTML = text;
    leftNameplate.innerHTML = leftPortraitLabel || '';
    rightNameplate.innerHTML = rightPortraitLabel || '';

    if (leftPortraitSprite) {
      G_display.drawSpriteToCanvas(leftPortraitSprite, leftCanvas);
      leftDiv.style.background = '';
    } else {
      G_display.drawRect(0, 0, 128, 128, BLACK, leftCanvas);
      leftDiv.style.background = BLACK;
    }
    if (rightPortraitSprite) {
      G_display.drawSpriteToCanvas(rightPortraitSprite, rightCanvas);
      rightDiv.style.background = '';
    } else {
      G_display.drawRect(0, 0, 128, 128, BLACK, rightCanvas);
      rightDiv.style.background = BLACK;
    }

    textArea.style.width = '256px';
    textArea.style['text-align'] = 'left';
    leftDiv.style.width = '128px';
    rightDiv.style.width = '128px';
    leftCanvas.style.transform = '';
    rightCanvas.style.transform = '';
    leftNameplate.style.color = YELLOW;
    leftNameplate.style.background = 'transparent';
    leftNameplate.style['text-decoration'] = '';
    rightNameplate.style.color = YELLOW;
    rightNameplate.style.background = 'transparent';
    rightNameplate.style['text-decoration'] = '';
    leftDiv.style['border-top'] = `2px solid ${BLACK}`;
    rightDiv.style['border-top'] = `2px solid ${BLACK}`;
    if (speaker === 'left') {
      rightCanvas.style.transform = 'translate(0px, 8px)';
      rightDiv.style.width = '96px';
      textArea.style.width = 'calc(288px - 32px)';
      leftNameplate.style.color = BLACK;
      leftNameplate.style.background = YELLOW;
      leftNameplate.style['text-decoration'] = 'underline';
      leftDiv.style['border-top'] = `2px solid ${YELLOW}`;
    } else if (speaker === 'right') {
      leftCanvas.style.transform = 'translate(-32px, 8px)';
      leftDiv.style.width = '96px';
      textArea.style.width = 'calc(288px - 32px)';
      textArea.style['text-align'] = 'right';
      rightNameplate.style.color = BLACK;
      rightNameplate.style.background = YELLOW;
      rightNameplate.style['text-decoration'] = 'underline';
      rightDiv.style['border-top'] = `2px solid ${YELLOW}`;
    } else if (speaker === 'both') {
      leftNameplate.style.color = BLACK;
      leftNameplate.style.background = YELLOW;
      leftNameplate.style['text-decoration'] = 'underline';
      leftDiv.style['border-top'] = `2px solid ${YELLOW}`;
      rightNameplate.style.color = BLACK;
      rightNameplate.style.background = YELLOW;
      rightNameplate.style['text-decoration'] = 'underline';
      rightDiv.style['border-top'] = `2px solid ${YELLOW}`;
      textArea.style['text-align'] = 'center';
    } else {
      // assume left only is speaking
      leftNameplate.style.color = BLACK;
      if (leftPortraitLabel) {
        leftNameplate.style.background = YELLOW;
      }
      leftNameplate.style['text-decoration'] = 'underline';
      if (leftPortraitSprite) {
        leftDiv.style['border-top'] = `2px solid ${YELLOW}`;
      }
      rightDiv.style.width = '32px';
      textArea.style.width = 'calc(324px)';
    }

    if (visible) {
      mainDiv.style.opacity = '1';
    } else {
      mainDiv.style.opacity = '0';
    }
  },
};
