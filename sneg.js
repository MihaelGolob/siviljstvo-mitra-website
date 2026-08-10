var SNEG = function () {
	/* Naredi html elemente z id-ji od 0 do ST_SNEZINK */
	var ST_SNEZINK = 40;
	var stej;
	for (stej = 0; stej < ST_SNEZINK; stej++) {
		var nak03 = Math.floor(Math.random()*4);
		/* Ta dolga kača naključno izbere eno od treh barv #FFFFFF #DDDDDD #CCCCCC */
		var barva = (nak03==3 || nak03==2) ? (nak03==3?'#CCCCCC':'#DDDDDD') : '#FFFFFF';
		/* Generiranje html div elementov */
		var starBody = document.body.innerHTML;
		document.body.innerHTML = '';
		document.body.innerHTML += '<div id="sneg' + stej + '">*</div>';
		document.body.innerHTML += starBody;
		/* Generiranje css lastnosti za html elemente */
		var snezinka = document.getElementById('sneg'+stej);
		snezinka.style.margin		= '0px 0px 0px 0px';
		snezinka.style.positon		= 'fixed';
		snezinka.style.zIndex		= '500';
		snezinka.style.position		= 'fixed';
		snezinka.style.color		= barva;
		snezinka.style.height		= '5px';
		snezinka.style.width		= '5px';
		snezinka.style.fontSize		= (Math.floor(Math.random()*17)+3) + 'px';
	}
	this.MatFunk = [
		function (xy) {
			xy[0] += 0.005;
			xy[1] = Math.sqrt(xy[0])/2;
			return xy;
		},
		function (xy) {
			xy[0] += 0.005;
			xy[1] = Math.sqrt(xy[0]);
			return xy;
		},
		function (xy) {
			xy[0] = 0;
			xy[1] = 2;
			return xy;
		},
		function (xy) {
			xy[0] = 1;
			xy[1] = 2;
			return xy;
		},
		function (xy) {
			xy[0] = 1.5;
			xy[1] = 1.5;
			return xy;
		},
		function (xy) {
			xy[0] = 0;
			xy[1] = 1.5;
			return xy;
		},
		function (xy) {
			xy[0] += 0.005;
			xy[1] = Math.sin(xy[0]);
			return xy;
		}
	];
	var that = this;
	var narediSnezinko = function (id) {
		/* Generiranje spremenljivk za eno snežinko za spreminjanje njenih koordinat */
		this.xy = [1, 1];
		this.zgoraj = Math.random()*window.innerHeight;
		this.levo = Math.random()*window.innerWidth;
		this.vijuga = Math.floor(Math.random()*that.MatFunk.length);
	};
	/* Generirane snežink */
	this.vseSnezinke = [];
	for (stej = 0; stej < ST_SNEZINK; stej++) {
		this.vseSnezinke[stej] = new narediSnezinko(stej);
	}
	this.premikSnezinke = function () {
		that.i++;
		for (stej = 0; stej < ST_SNEZINK; stej++) {
			var s = that.vseSnezinke[stej];
			s.xy = that.MatFunk[s.vijuga](s.xy);
			s.levo += s.xy[0];
			s.zgoraj += s.xy[1];
			if (s.levo > window.innerWidth + 50) {s.levo = 1; s.xy = [1, 1]; s.vijuga = s.vijuga;}
			if (s.zgoraj > window.innerHeight + 50) {s.zgoraj = 1; s.xy = [1, 1]; s.vijuga = s.vijuga;}
			document.getElementById('sneg'+stej).style.margin = s.zgoraj + 'px 0px 0px ' + s.levo+'px';
		}
		window.requestAnimationFrame(that.premikSnezinke);
	};
};
var a = new SNEG();
a.premikSnezinke();
