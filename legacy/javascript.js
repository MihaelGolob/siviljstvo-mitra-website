 // konstante
var STEVILO_VSEH_SLIK = 11;
var TRANSITION = 1000 * 0.5; // transition v sekundah
var CAS_PRIKAZA_SLIKE = 1000 * 3.5; // sekunde
// spremenljivke
var stevec = 2;

function slide() {
    setTimeout(fadeOut, CAS_PRIKAZA_SLIKE);
    setTimeout(function (){
        stevec++;
        var image = document.getElementById('img1');
        image.src = 'slike/krozenje/' + stevec + '.png';
    }, CAS_PRIKAZA_SLIKE + TRANSITION);

    setTimeout(fadeIn, CAS_PRIKAZA_SLIKE* 2)
    setTimeout(function (){
        stevec++;
        if (stevec >= STEVILO_VSEH_SLIK){stevec = 1}
        var image = document.getElementById('img2');
        image.src = 'slike/krozenje/' + stevec + '.png';
    }, CAS_PRIKAZA_SLIKE* 2 + TRANSITION);
};

function fadeIn(){
    document.getElementById('img1').style.opacity = '1';
}
function fadeOut(){
    document.getElementById('img1').style.opacity = '0';
}


//----------------------- PONUDBA -------------------------------//

var stevilo = 1;
var slika = document.getElementById('zamenjajSliko');
var kategorija1;


function zapri() {
    document.getElementById('zatemnitev').style.opacity = '0';
    setTimeout(function(){document.getElementById('zatemnitev').style.zIndex = '-1';}, 500);
}
function naprej() {
    stevilo++;
    if (steviloSlik < stevilo) {stevilo = steviloSlik;}
    document.getElementById('zamenjajSliko').src = 'ponudba/slike/' + kategorija1 + '/' + stevilo + '.JPG';
    document.getElementById('stevilka-slike').innerHTML = stevilo + '/' + steviloSlik;
}
function nazaj() {
    stevilo--;
    if (stevilo < 1) {stevilo = 1;}
    document.getElementById('zamenjajSliko').src = 'ponudba/slike/' + kategorija1 + '/' + stevilo + '.JPG';
    document.getElementById('stevilka-slike').innerHTML = stevilo + '/' + steviloSlik;
}

function pokazi(kategorija, stSlik){
    document.getElementById('zatemnitev').style.opacity = '1';
    document.getElementById('zatemnitev').style.zIndex = '1';
    document.getElementById('zamenjajSliko').src = 'ponudba/slike/'+kategorija+'/1.JPG';
    steviloSlik = stSlik;
    stevilo = 1;
    kategorija1 = kategorija;
    document.getElementById('stevilka-slike').innerHTML = '1' + '/' + stSlik;
}