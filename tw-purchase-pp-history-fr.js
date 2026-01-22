(function () {

    if (typeof game_data === 'undefined') {
        return;
    }

    // 🔒 Ne s'exécute QUE sur le journal des PP
    if (game_data.screen !== 'premium' || game_data.mode !== 'log') {
        UI.InfoMessage(
            'Ouvre le journal des Points Premium puis relance le script.',
            4000
        );
        return;
    }

    // ⏳ Attendre que le tableau soit présent
    if (!document.querySelector('table.vis')) {
        UI.InfoMessage(
            'Chargement du journal des PP… relance le script dans 2 secondes.',
            3000
        );
        return;
    }

// ============================================================================
// Tribal Wars – Journal des Points Premium
// Auteur : Cloudburn
// Version : 1.0
//
// Description :
// Analyse l'intégralité du Journal des Points Premium et affiche :
//  - PP achetés
//  - PP farmés (échange de ressources)
//  - PP dépensés
//  - Autres gains (événements, récompenses, concours…)
//  - Détail par monde
//
// Sécurité :
// ✔ Lecture seule
// ✔ Aucune donnée envoyée
// ✔ Aucun stockage local
//
// Compatible :
// ✔ Version navigateur (desktop)
// ✔ Script approuvable par InnoGames
// ============================================================================

// ======================================================
// Vérification de la page - Redirection si nécessaire
// ======================================================

(function () {

    // 🔒 Sécurité : attendre que le jeu soit prêt
    if (typeof game_data === 'undefined') {
        console.warn('[PP] game_data non disponible');
        return;
    }

    // 📍 Si on n'est PAS sur le journal des PP → redirection
    if (game_data.screen !== 'premium' || game_data.mode !== 'log') {
        console.log('[PP] Redirection vers le journal des points premium');
        location.href = game_data.link_base_pure + 'premium&mode=log';
        return;
    }

    // ⏳ Attendre que le tableau soit chargé
    if (!document.querySelector('table.vis')) {
        console.log('[PP] Page en cours de chargement, relancez le script');
        UI.InfoMessage('Chargement du journal des PP… relancez le script.', 3000);
        return;
    }

(function () {

    console.clear();
    console.log("▶️ Analyse du Journal des Points Premium");

    /* =========================
       TOTAUX GLOBAUX
    ========================= */

    let totalAchetes = 0;
    let totalFarmes = 0;
    let totalDepenses = 0;
    let totalAutres = 0;
    let totalOfferts = 0;
    let totalRecus = 0;

    let worlds = {};
    let stopScan = false;

    /* =========================
       URL DE BASE
    ========================= */

    let baseURL = game_data.player.sitter > 0
        ? `/game.php?t=${game_data.player.id}&screen=premium&mode=log&page=`
        : `/game.php?screen=premium&mode=log&page=`;

    /* =========================
       NOMBRE DE PAGES
    ========================= */

    let maxPages = 1;
    try {
        const nav = $(".paged-nav-item");
        if (nav.length > 0) {
            maxPages = parseInt(nav.last().attr("href").match(/page=(\d+)/)[1]);
        }
    } catch (e) {}

    let urls = [];
    for (let i = 0; i <= maxPages; i++) {
        urls.push(baseURL + i);
    }

    /* =========================
       SCAN DES PAGES
    ========================= */

    function scanPage(index) {

        if (index >= urls.length || stopScan) {
            afficherResultats();
            return;
        }

        $.get(urls[index]).done(html => {

            const rows = $(html).find("table.vis > tbody > tr");
            if (rows.length <= 1) {
                stopScan = true;
                afficherResultats();
                return;
            }

            for (let i = 1; i < rows.length; i++) {

                const cols = rows[i].children;
                if (!cols || cols.length < 5) continue;

                let monde = cols[1].innerText.trim();
                let transaction = cols[2].innerText.trim();
                let changement = parseInt(cols[3].innerText.trim());

                if (isNaN(changement)) continue;

                // Monde spécial
                if (monde.toLowerCase() === "master") {
                    monde = "Concours Discord";
                }

                if (!worlds[monde]) {
                    worlds[monde] = { achetes: 0, farmes: 0, depenses: 0 };
                }

                const isGift = /gift|cadeau|don/i.test(transaction);

                /* ========= NÉGATIF ========= */
                if (changement < 0) {

                    if (isGift) {
                        totalOfferts += Math.abs(changement);
                    } else {
                        totalDepenses += Math.abs(changement);
                        worlds[monde].depenses += Math.abs(changement);
                    }
                }

                /* ========= POSITIF ========= */
                else {

                    if (isGift) {
                        totalRecus += changement;
                    }
                    else if (/purchase/i.test(transaction)) {
                        totalAchetes += changement;
                        worlds[monde].achetes += changement;
                    }
                    else if (/transfer/i.test(transaction)) {
                        totalFarmes += changement;
                        worlds[monde].farmes += changement;
                    }
                    else {
                        totalAutres += changement;
                    }
                }
            }

            setTimeout(() => scanPage(index + 1), 250);

        }).fail(() => {
            stopScan = true;
            afficherResultats();
        });
    }

    /* =========================
       AFFICHAGE FINAL
    ========================= */

    function afficherResultats() {

        let difference =
            totalAchetes +
            totalFarmes +
            totalAutres +
            totalRecus -
            totalDepenses -
            totalOfferts;

        let html = `
        <tr><th colspan="5"><center><h2>Journal des Points Premium</h2></center></th></tr>
        <tr><th colspan="5">PP achetés : ${totalAchetes}</th></tr>
        <tr><th colspan="5">PP farmés : ${totalFarmes}</th></tr>
        <tr><th colspan="5">Autres gains : ${totalAutres}</th></tr>
        <tr><th colspan="5">PP reçus : ${totalRecus}</th></tr>
        <tr><th colspan="5">PP offerts : ${totalOfferts}</th></tr>
        <tr><th colspan="5">PP dépensés : ${totalDepenses}</th></tr>
        <tr><th colspan="5"><b>Différence calculée : ${difference}</b></th></tr>
        <tr>
            <th>Monde</th>
            <th>Achetés</th>
            <th>Farmés</th>
            <th>Dépensés</th>
            <th>Différence</th>
        </tr>
        `;

        Object.keys(worlds).forEach(monde => {
            const w = worlds[monde];
            html += `
            <tr>
                <td>${monde}</td>
                <td>${w.achetes}</td>
                <td>${w.farmes}</td>
                <td>${w.depenses}</td>
                <td>${w.achetes + w.farmes - w.depenses}</td>
            </tr>`;
        });

        Dialog.show("Journal PP", `
            <table class="vis" width="100%">
                ${html}
            </table>
        `);
    }

    /* =========================
       LANCEMENT
    ========================= */

    scanPage(0);

})();
