function drsnice (naslovSlike1, naslovSlike2, naslovSlike3, naslovSlike4, naslovSlike5, naslovSlike6, naslovSlike7, cas_med_slikami) {
    var naslednja_slika = [naslovSlike1, naslovSlike2, naslovSlike3, naslovSlike4, naslovSlike5, naslovSlike6, naslovSlike7];
    var stevec_slik=0;

    setInterval(function (){
        stikalo_za_pogon=true;
        (stevec_slik<6)?(stevec_slik++):(stevec_slik=0);
        spremeni_prosojnost('menjaj');
        setTimeout(function () {document.getElementById('menjava').src=naslednja_slika[stevec_slik];},800);
    },cas_med_slikami);

}  
//Funkcija spremeni_prosojnost skupaj z globalnimi spremenljivkami
var stikalo_za_pogon=false;
var stevec_za_prosojnost=0;
function spremeni_prosojnost(id_slike) {
    if (stikalo_za_pogon) {
        var slika_prosojnost=document.getElementById(id_slike).style; 
        var zbirka_vrednosti_opacity=[0, 0.0625, 0.125, 0.1875, 0.25, 0.3125, 0.375, 0.4375, 0.5, 0.5625, 0.625, 0.6875, 0.75, 0.8125, 0.875, 0.9375, 1, 0.9375, 0.875, 0.8125, 0.75, 0.6875, 0.625, 0.5625, 0.5, 0.4375, 0.375, 0.3125, 0.25, 0.1875, 0.125, 0.0625, 0];
        stevec_za_prosojnost++;
        slika_prosojnost.opacity=zbirka_vrednosti_opacity[stevec_za_prosojnost];
        if (stevec_za_prosojnost == (zbirka_vrednosti_opacity.length)-1) {stikalo_za_pogon=false; stevec_za_prosojnost=0;}
        setTimeout("spremeni_prosojnost('menjaj')",50);
    }
}