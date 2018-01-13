var viewportSize = [
	{width: 1400,height: 768, name: '1024x768'},
	{width: 360, height: 640, name: '360x640'}
];

viewportSize.forEach(function (viewport) {
	casper.test.begin('Init test', function suite(test) {
		casper.start("http://localhost:3000", function() {
			this.viewport(viewport.width, viewport.height);
			this.echo('CasperJS ready', 'COMMENT');
		});

		casper.run(function() {
			test.done();
		});
	});
});