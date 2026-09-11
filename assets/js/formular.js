// Aufnahmeantrag-Entwurf /mitglied-werden/ (P7) – reiner Entwurf: kein
// Netzwerkaufruf, kein Speichern, keine Cookies. Das Formular trägt
// "novalidate", damit hier ausschließlich diese eigene Anzeige der
// HTML5-Validierung (per checkValidity()) greift statt der Browser-eigenen
// Sprechblasen.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".formular");
  if (!form) return;

  const erfolg = form.querySelector(".formular__erfolg");
  const abteilungFussball = form.querySelector("#mw-abt-fussball");
  const abteilungKarneval = form.querySelector("#mw-abt-karneval");
  const abteilungFehler = form.querySelector("#mw-abteilung-fehler");

  // Gruppen-Pflicht "mindestens eine Abteilung" lässt sich mit "required"
  // an einer einzelnen Checkbox nicht abbilden – daher per
  // setCustomValidity() an der ersten Checkbox der Gruppe, damit
  // form.checkValidity() die Gruppe mit prüft.
  function pruefeAbteilungsgruppe() {
    if (!abteilungFussball || !abteilungKarneval) return;
    if (!abteilungFussball.checked && !abteilungKarneval.checked) {
      abteilungFussball.setCustomValidity("Bitte mindestens eine Abteilung wählen.");
    } else {
      abteilungFussball.setCustomValidity("");
    }
  }

  function fehlertext(feld) {
    if (feld.validity.valueMissing) return "Bitte ausfüllen";
    if (feld.validity.typeMismatch && feld.type === "email") {
      return "Bitte eine gültige E-Mail-Adresse eingeben";
    }
    if (feld.validity.patternMismatch && feld.id === "mw-plz") {
      return "Bitte eine gültige Postleitzahl eingeben (5 Ziffern)";
    }
    if (feld.validity.patternMismatch && feld.id === "mw-iban") {
      return "Bitte eine gültige IBAN eingeben";
    }
    if (feld.validity.patternMismatch) return "Bitte eine gültige Eingabe eingeben";
    return "Bitte ausfüllen";
  }

  function zeigeFehler(feld) {
    const wrapper = feld.closest(".formular__feld, .formular__checkzeile-block");
    const fehlerEl = wrapper ? wrapper.querySelector(".formular__fehler") : null;
    if (!fehlerEl) return;
    if (feld.validity.valid) {
      fehlerEl.hidden = true;
      fehlerEl.textContent = "";
    } else {
      fehlerEl.hidden = false;
      fehlerEl.textContent = fehlertext(feld);
    }
  }

  function zeigeAbteilungsfehler() {
    if (!abteilungFehler || !abteilungFussball) return;
    abteilungFehler.hidden = abteilungFussball.validity.valid;
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    pruefeAbteilungsgruppe();

    const einzelfelder = [...form.querySelectorAll("input, select")].filter(
      (feld) => feld !== abteilungFussball && feld !== abteilungKarneval
    );

    let ersterUngueltiger = null;
    for (const feld of einzelfelder) {
      zeigeFehler(feld);
      if (!feld.validity.valid && !ersterUngueltiger) ersterUngueltiger = feld;
    }
    zeigeAbteilungsfehler();
    if (!abteilungFussball.validity.valid && !ersterUngueltiger) ersterUngueltiger = abteilungFussball;

    if (form.checkValidity()) {
      if (erfolg) erfolg.hidden = false;
    } else {
      if (erfolg) erfolg.hidden = true;
      if (ersterUngueltiger) ersterUngueltiger.focus();
    }
  });

  if (abteilungFussball) abteilungFussball.addEventListener("change", pruefeAbteilungsgruppe);
  if (abteilungKarneval) abteilungKarneval.addEventListener("change", pruefeAbteilungsgruppe);
});
