/*
global
G_display
*/

const G_ui = {
  Loading() {
    const pct = G_display.numLoading / G_display.numLoaded;
    const screenSize = 512;
    G_display.drawRect(0, 0, screenSize, screenSize, '#000');
    G_display.drawText('Loading...', 256, 256);
    G_display.drawText(`${(pct * 100).toFixed(0)}%`, 256, 256 + 32);
    G_display.drawRect(32, screenSize - 128, screenSize - 64, 32, '#f00');
    G_display.drawRect(
      32,
      screenSize - 128,
      pct * (screenSize - 64),
      32,
      '#fff'
    );
  },
  Dialog() {
    let speaker = 'right';

    const id = 'Adalais_in_the_arcade_dialog_div';
    let div = document.getElementById(id);
    if (div) {
      div.remove();
    }
    div = document.createElement('div');
    div.innerHTML = '';
    div.id = id;
    div.style.position = 'relative';
    div.style.width = '512px';
    div.style.height = '128px';
    div.style.background = 'url(res/images/ui-black-bar.png)';
    // div.style.border = '1px solid white';
    div.style.top = '-128px';
    div.style['box-sizing'] = 'border-box';
    div.style['user-select'] = 'none';
    div.style.display = 'flex';
    div.style['justify-content'] = 'space-between';
    div.style.overflow = 'hidden';

    const extraBoxSize = 32;

    const leftPortrait = document.createElement('div');
    leftPortrait.style.width =
      speaker === 'left' ? '128px' : `${128 - extraBoxSize}px`;
    leftPortrait.style.height = '128px';
    const leftCanvas = document.createElement('canvas');
    leftCanvas.width = '128';
    leftCanvas.height = '128';
    // leftCanvas.style.transform =
    //   speaker === 'left' ? '' : `translate(-${extraBoxSize}px, 15px)`;
    leftPortrait.appendChild(leftCanvas);
    G_display.drawSpriteToCanvas('ada-regular', leftCanvas);
    div.appendChild(leftPortrait);

    const textArea = document.createElement('div');
    textArea.style.width = `${256 + extraBoxSize}px`;
    textArea.style.height = '128px';
    textArea.style.background = '#101E29';
    div.appendChild(textArea);

    const rightPortrait = document.createElement('div');
    rightPortrait.style.width =
      speaker === 'right' ? '128px' : `${128 - extraBoxSize}px`;
    rightPortrait.style.height = '128px';
    rightPortrait.style.overflow = 'hidden';
    const rightCanvas = document.createElement('canvas');
    rightCanvas.width = '128';
    rightCanvas.height = '128';
    // rightCanvas.style.transform =
    //   speaker === 'right' ? '' : `translate(${extraBoxSize}px, 15px)`;
    rightPortrait.appendChild(rightCanvas);
    G_display.drawSpriteToCanvas('iroha-regular', rightCanvas);
    div.appendChild(rightPortrait);

    G_display.canvas.parentElement.appendChild(div);
  },
};
