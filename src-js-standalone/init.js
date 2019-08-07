/* global setStyle, engine, debug, bodyStyle, stylize */
var init = () => {
  //eslint-disable-line
  console.log('init');
  if (!window.IN2) {
    setStyle();
    document.body.style = stylize(bodyStyle);
  }
  engine.init();
  if (!window.IN2COMPILER) {
    debug.showMap();
  }
};
init();
