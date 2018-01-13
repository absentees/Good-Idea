import layout from './modules/layout';

import $ from 'jquery';



$(document).ready(function () {
  window.ie8 = $('html').hasClass('lt-ie9');

  const test = new layout();
  test.init();

	
});




