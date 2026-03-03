const readline = require('readline').createInterface({ 
    input: process.stdin, 
    output: process.stdout
}); 
const question = (str) => new Promise(resolve => readline.question(str, resolve));

const { webcrypto } = require('crypto');
const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

console.log("Ładuje baze: ", process.env.DB_NAME);

client.connect()
.then(() => console.log(`Połączono z PostgreSQL`))
.catch(err => console.error(`Błąd połączenia: `, err.stack));

function ograniczZGory(wartosc, zmiana, limit){
    return Math.min(wartosc + zmiana, limit);
}

function ograniczZDolu(wartosc, zmiana){
    return Math.max(wartosc -zmiana, 0);
}

function czyTrafiony(szansa){
    let los = Math.floor(Math.random() * 100) + 1;
    return los <= szansa;
}

function wykonajZakup(gracz, koszt, akcja) {
        if (gracz.zloto >= koszt) {
            gracz.zloto -= koszt;
            akcja();
            return true;
        }
    
    console.log("za mało złota");
    return false;
    }

function WykonajAtak(atakujący, broniący){
    if (czyTrafiony(10)){
        console.log(`${atakujący.imie} zamachnał się, ale nie trafił geralda!`);
        return;
    }

    
    if (broniący.imie === 'Gerald'){
        let szansanaunik = 10 + (broniący.lvlZbroi * 5) + broniący.zwinnosc;
        if (czyTrafiony(szansanaunik)) {
            console.log(`Unik! Gerald odskoczył od ataku ${atakujący.imie}`);
            return;
        }
       }
       let obrazenia = Math.floor(Math.random() * atakujący.sila) + 1;

       if (czyTrafiony(15)){
        obrazenia = Math.floor(obrazenia * 1.5);
        console.log(`Cios krytyczny! ${atakujący.imie} trafił w czuły punkt`);
       }

       broniący.hp -= obrazenia;

       console.log('------------');
       console.log(`${atakujący.imie} zadaje ${obrazenia} pkt obrażeń`);
       console.log(`Geraldowi zostało ${Math.max(broniący.hp, 0)} HP`);
       console.log('------------');
    }



async function Sklep(gracz) {
    const ulepszenieMiecza = [
        {nazwa: "Drewniany miecz", bonus: 5, koszt: 10},
        {nazwa: "Stalowy Miecz", bonus: 12, koszt: 80},
        {nazwa: "Srebny Miecz", bonus: 25, koszt: 200},
        {nazwa: "Miecz Wiedźmiński", bonus: 50, koszt: 500}
    ];

    const ulepszeniazbroi =[
        {nazwa: "Skórzana Kurtka", bonus: 30, koszt: 50},
        {nazwa: "Kolczuga", bonus: 70, koszt:120},
        {nazwa: "Zbroja Płytowa", bonus: 150, koszt:300},
        {nazwa: "Zbroja Gryfa", bonus:300, koszt:700}
    ];
 
    if (gracz.hp <= 0) return;
    let nastepnymiecz = ulepszenieMiecza[gracz.lvlMiecza];
    let nastepnazbroja = ulepszeniazbroi[gracz.lvlZbroi];

    console.log(`\n-----------------`);
    console.log(`--KUŹNIA-- Twój majątek: ${gracz.zloto} złota`);

    if (nastepnymiecz) console.log(`1. KUP ${nastepnymiecz.nazwa} (+${nastepnymiecz.bonus} siły) Koszt: ${nastepnymiecz.koszt}`);
    else console.log(`1. Miecz na poziomie max`);

    if (nastepnazbroja) console.log(`2. KUP: ${nastepnazbroja.nazwa} (+${nastepnazbroja.bonus} Max HP) Koszt: ${nastepnazbroja.koszt}`);
    else console.log(`2. Zbroja na poziomie max`);

    console.log("3. Eliksir Jaskółka (40 złota)");
    console.log("4. Wyjdź z kuźni");

    let wybor = await question("Twój wybór: ");

    if (wybor === "1" && nastepnymiecz) {
        wykonajZakup(gracz, nastepnymiecz.koszt, () => {
            gracz.sila += nastepnymiecz.bonus;
            gracz.lvlMiecza++;
            console.log(`Nowy miecz. Siła: ${gracz.sila}`);
        });
    } else if (wybor === "2" && nastepnazbroja) {
        wykonajZakup(gracz, nastepnazbroja.koszt, () => {
            gracz.MaxHP += nastepnazbroja.bonus;
            gracz.hp = gracz.MaxHP;
            gracz.lvlZbroi++;
            console.log(`Nowa zbroja. Max HP: ${gracz.MaxHP}`);
        });
    } else if (wybor === "3"){
        wykonajZakup(gracz, 40, () => {
            gracz.plecak.push({nazwa: "Eliksir Jaskółka", leczenie: 40, typ: "mikstura", wartosc: 15});
            console.log("Mikstura znajduje sie w pleecaku");
            })
    }
}

async function LosoweZdarzenie(gracz) {
    let los = Math.floor(Math.random() * 100) + 1;
    console.log(`\nEksploracja lochów...`);
    if (los <= 15){
        let zloto = Math.floor(Math.random() * 30) + 10;
        gracz.zloto += zloto;
        console.log(`Znalazłeś sakiewkę! +${zloto} złota`);
    } else if (los <= 30){
        gracz.hp -= 15;
        console.log(`Wpadłeś w pułapkę! -15 HP`);
    } else {
        console.log("Nic ciekawego się nie wydarzyło.");
    }
}

function ZapiszGrePlik(gracz){
    const dane = JSON.stringify(gracz, null, 2);
    fs.writeFileSync('savegame.json', dane);
    console.log("💾 Gra Została Zapisana do pliku!");
}

function WczytajGre(){
    if (fs.existsSync('savegame.json')){
        const dane = fs.readFileSync('savegame.json', 'utf8');
        return JSON.parse(dane);
    }
    return null;
}

async function WczytajZBazy() {
    try {
        console.log("Przeszukuje zapisy...");
        const res = await client.query('SELECT * FROM bohater ORDER BY idgracza DESC LIMIT 5');
        
        if (res.rows.length === 0) {
            console.log("Brak zapisów w bazie");
            return null;
        }

        console.log("---LISTA ZAPISÓW W BAZIE---");
        res.rows.forEach((row, idx) => {
            console.log(`${idx + 1}. ${row.imie} | Poziom: ${row.poziom} | HP: ${row.hp}/${row.maxhp} | Data: ${row.idgracza}`);
        });

        let wybor = await question("Wybierz numer zapisu (0 by anulowac): ");
        let idx = parseInt(wybor) - 1;

        if (res.rows[idx]){
            const w = res.rows[idx];
            console.log(`Wczytano postać: ${w.imie}`);

            return{
                imie: w.imie,
                hp: w.hp,
                MaxHP: w.maxhp,
                sila: w.sila,
                zloto: w.zloto,
                exp: w.exp,
                poziom: w.poziom,
                lvlMiecza: w.lvlMiecza,
                lvlZbroi: w.lvlZbroi,
                plecak: w.plecak ? w.plecak.split(", ").map(item => ({nazwa: item})) : [],
                mocMikstury: w.mocmikstury,
                energia: w.energia === null ? 100 : w.energia,
                maxEnergia: w.maxenergia === null ? 100 : w.maxenergia,
                punktyrozwoju: w.punktyrozwoju,
                moc: w.moc,
                zwinnosc: w.zwinnosc,
                negocjacja: w.negocjacja,
                wzrok: w.wzrok
            };
        }
    } catch (err) {
        console.log("Błąd podczas wczytywania danych:", err.stack);
    }
    return null;
}

function sprawdzAwans(gracz) {
    if (gracz.exp >= 100) {
        gracz.poziom += 1;
        gracz.exp -= 100;
        gracz.punktyrozwoju +=5
        console.log("----------");
        console.log(`Awans postaci! Aktualny poziom: ${gracz.poziom} do wydania ${gracz.punktyrozwoju} puntków rozwoju`);
        console.log("----------");
    }
}

   async function ZapiszGre(gracz) {
                    ZapiszGrePlik(gracz);
                    try {
                        const plecakTekst = gracz.plecak.map(p => p.nazwa).join(", ");
                        const query = `
                        INSERT INTO bohater (imie, hp, maxhp, sila, zloto, exp, poziom, lvlmiecza, lvlzbroi, plecak, mocmikstury, energia, maxenergia, punktyrozwoju, moc, zwinnosc, negocjacja, wzrok)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                        `;
                        const values = [
                            gracz.imie, gracz.hp, gracz.MaxHP, gracz.sila, gracz.zloto, 
                            gracz.exp, gracz.poziom, gracz.lvlMiecza, gracz.lvlZbroi, 
                            plecakTekst, gracz.mocMikstury, gracz.energia, gracz.maxEnergia, gracz.punktyrozwoju, gracz.moc, gracz.zwinnosc, gracz.negocjacja, gracz.wzrok
                        ];
                        await client.query(query, values);
                        console.log("Statystyki zapisane w PostgreSQL");
                    } catch (err){
                        console.log("Błąd PostgreSQL: ", err.stack);
                    }
                }

                async function MenuRozwoju(gracz) {
                    while (gracz.punktyrozwoju > 0){
                        console.log(`--- Drzewko umiejętności (Punkty: ${gracz.punktyrozwoju}) ---`);
                        console.log(`1.Siła (2+ pkt): aktualnie ${gracz.sila}`);
                        console.log(`2.Wytrzymałość (+20 MaxHP): aktualnie: ${gracz.MaxHP}`);
                        console.log(`3.Zwinność (+1 szansy na unik): aktualnie ${gracz.zwinnosc}`);
                        console.log(`4.Moc (+5 dmg Igni): aktualnie ${gracz.moc}`);
                        console.log(`5.Negocjacja (+10% ceny sprzedaży): aktualnie ${gracz.negocjacja}`);
                        console.log(`6.Ostry wzrok (+5% szansy na łup): aktualnie ${gracz.wzrok}`);
                        console.log(`7.Wyjdź`);

                        let wybor = await question("W co inwestujesz");

                        if (wybor === "1"){
                            gracz.sila += 2;
                            gracz.punktyrozwoju -= 1;
                        } else if(wybor === "2"){
                            gracz.MaxHP += 20;
                            gracz.hp += 20;
                            gracz.punktyrozwoju -= 1;
                        } else if(wybor === "3"){
                            gracz.zwinnosc += 1;
                            gracz.punktyrozwoju -= 1;
                        } else if (wybor === "4"){
                            gracz.moc += 5;
                            gracz.punktyrozwoju -= 1;
                        } else if(wybor === "5"){
                            gracz.negocjacja += 1;
                            gracz.punktyrozwoju -= 1;
                        } else if(wybor === "6"){
                            gracz.wzrok += 1;
                            gracz.punktyrozwoju -= 1;
                        } else if (wybor === "7"){
                            break;
                        }
                    } if (gracz.punktyrozwoju === 0){
                        console.log("Nie masz puntków rozwoju do rozdania!");
                        return;
                    }
                }

async function main() { 
    let gracz;
    let aktywneZlecenie = null;
    console.log("---TWOJE ZAPISY---");
    console.log("1. Wczytaj z pliku");
    console.log("2. Wczytaj z bazy danych");
    console.log("3. Nowa gra");

    let wyborStartowy = await question("Wybierz opcje: ");

    if (wyborStartowy === "1"){
        let zapis = WczytajGre();
        if (zapis) gracz = zapis;
    } else if (wyborStartowy === "2"){
        gracz = await WczytajZBazy();
    }

    if(!gracz){
        console.log("Rozpoczynasz nową przygodę jako Gerald");
        gracz = {
            imie: 'Gerald', hp: 100, MaxHP: 100, sila: 15, zloto: 0, exp: 0, 
            poziom: 1, lvlMiecza: 0, lvlZbroi: 0, plecak: [], mocMikstury: 15,
            energia: 100, maxEnergia: 100, punktyrozwoju: 0, moc: 10, zwinnosc: 5, negocjacja: 0, wzrok: 0
        };
    }

    let bestariusz = [
        { imie: 'Goblin', hp: 30, sila: 5, nagroda: 10, exp: 200, drop: {nazwa: "Jaskółka", leczenie: 40, szansa: 50, typ: "mikstura"} },
        { imie: 'Zły Ork', hp: 60, sila: 10, nagroda: 25, exp: 500, drop: {nazwa: "Kieł Orka", wartosc: 20, szansa: 70, typ: "trofeum"} },
        { imie: 'Gryf', hp: 120, sila: 18, nagroda: 70, exp: 1000, drop: {nazwa: "Ząb Gryfa", wartosc:40,  silabonus: 12, typ: "bron", szansa: 50} },
        { imie: 'WŁADCA CIENI (BOSS)', hp: 250, sila: 25, nagroda: 2000, exp: 300, typ: 'boss', drop: {nazwa: "Eliksir Wielkiej mocy", wartosc: 80 ,leczenie: 150, szansa: 100, typ: "mikstura"} }
    ];

async function TablicaZgloszen(gracz) {
    const Questy = [
        {id: 1,nazwa: "Zabij Gryfa", cel: "Gryf", nagrodazadania: 50},
        {id: 2,nazwa: "Władca cieni", cel: "WŁADCA CIENI (BOSS)",nagrodazadania: 200}
    ];
    
    console.log("---TABLICA OGŁOSZEŃ---");

    Questy.forEach((q, idx) => console.log(`${idx + 1}. ${q.nazwa} (Nagroda: ${q.nagrodazadania} zł)`));

    console.log("0. Wyjdź");

    let wyborzadania = await question("Wybierz zadanie: ");
    let wybranyQuest = Questy[parseInt(wyborzadania) - 1];

    if (wybranyQuest) {
        aktywneZlecenie = wybranyQuest;
        console.log(`Przyjęto zlecenie: ${wybranyQuest.nazwa}. Zabij ${wybranyQuest.cel}, aby odebrać nagrode`);
    }
}

    console.log('--- POCZĄTEK PRZYGODY ---');

    for (let i = 0; i < bestariusz.length; i++) {
        let przeciwnik = bestariusz[i]; 
        let ignidostepne = true;
        
        console.log(`\n==========================`);
        console.log(`POZIOM ${i + 1}: ${przeciwnik.imie}`);
        console.log(`==========================`);

        while(gracz.hp > 0 && przeciwnik.hp > 0) {
            let turaZakonczona = false;
            while(!turaZakonczona) {
                console.log(`\nGerald: ${gracz.hp}/${gracz.MaxHP} HP | Kondycja: ${gracz.energia}/${gracz.maxEnergia} | ${przeciwnik.imie}: ${przeciwnik.hp} HP`);
                console.log(`1. Szybki atak | 2. Mocny atak | 3. Leczenie | 4. Odpoczynek`);
                if (gracz.poziom >= 2 && ignidostepne) console.log(`5. Znak Igni`);
                console.log(`6. Plecak | 7. Zapisz grę | 8.Sprzedaj przedmioty | 9.Rozwój postaci | 10.Tablica Zadań`);

                let wybor = await question("Twój wybór: ");

                if (wybor === "1") {
                    if (gracz.energia >= 10){
                        gracz.energia = ograniczZDolu(gracz.energia, 10);
                        przeciwnik.hp -= gracz.sila;
                        console.log(`Zadałeś ${gracz.sila} obrażeń!`);
                        turaZakonczona = true;
                    } else console.log("Masz zbyt mało kondycji!");
                } else if (wybor === "2") {
                    if (gracz.energia >= 25){
                        gracz.energia -= 25;
                        if (czyTrafiony(50)) {
                            let mocny = gracz.sila * 2;
                            przeciwnik.hp -= mocny;
                            console.log(`MOCNY CIOS! -${mocny} HP`);
                        } else console.log("Pudło!");
                        turaZakonczona = true;
                    } else console.log("Masz za mało energii!");
                } else if (wybor === "3") {
                    gracz.hp = ograniczZGory(gracz.hp, 25, gracz.MaxHP);
                    console.log(`Uleczono! HP: ${gracz.hp}/${gracz.MaxHP}`);
                    turaZakonczona = true;
                } else if (wybor === "4") {
                    gracz.energia = ograniczZGory(gracz.energia, 30, gracz.maxEnergia);
                    console.log("Gerald bierze głęboki oddech. Odzyskałeś 30 energii.");
                    turaZakonczona = true;
                } else if (wybor === "5" && gracz.poziom >= 2 && ignidostepne){
                    if (gracz.energia >= 40) {
                        gracz.energia -= 40;
                        let obrazeniaIgni = 30 + (gracz.poziom * 2) + gracz.moc;
                        przeciwnik.hp -= obrazeniaIgni;
                        ignidostepne = false;
                        console.log(`Użyto Igni! ${przeciwnik.imie} traci ${obrazeniaIgni} HP`);
                        turaZakonczona = true;
                    } else console.log("Masz za mało energii!");
                } else if (wybor === "6") {
                    if (gracz.plecak.length === 0) console.log("Plecak pusty!");
                    else {
                        console.log("\n--- PLECAK ---");
                        gracz.plecak.forEach((p, idx) => console.log(`${idx + 1}. ${p.nazwa}`));
                        let pWybor = await question("Użyć? (nr lub 0): ");
                        let idx = parseInt(pWybor) - 1;
                        if (gracz.plecak[idx]) {
                            let p = gracz.plecak[idx];
                            if (p.typ === "mikstura"){
                                gracz.hp = ograniczZGory(gracz.hp, p.leczenie, gracz.MaxHP);
                                console.log(`Użyto: ${p.nazwa}. Przywrócono ${p.leczenie} HP`);
                                gracz.plecak.splice(idx, 1);
                            } else if(p.typ === "bron") {
                                gracz.sila += p.silabonus;
                                console.log(`Wyposażenie: ${p.nazwa}. siła wzrosła o ${p.silabonus}!`);
                                gracz.plecak.splice(idx, 1);
                            } else if(p.typ === "trofeum"){
                                console.log(`To jest trofeum (${p.nazwa}). Nie możesz go użyć, ale możesz je drogo sprzedać u kowala`);  
                            gracz.plecak.splice(idx, 1);                          
                        }
                    }
                    }
                } else if (wybor === "7"){
                    await ZapiszGre(gracz); 
                } else if (wybor === "8"){

                    if(gracz.plecak.length === 0){
                        console.log("Plecak pusty!");
                    } else{
                        console.log("--- CO CHCESZ SPRZEDAC?---");
                        gracz.plecak.forEach((p, idx) => {
                            console.log(`${idx + 1}. ${p.nazwa} (Cena: ${p.wartosc || 0} zł)`);
                        });

                        let pWybor = await question("Wybierz numer przedmiotu (0 aby wrócic): ");
                        let idx = parseInt(pWybor) - 1;

                        if (gracz.plecak[idx]) {
                            let p = gracz.plecak[idx];
                            if (p.wartosc > 0) {
                                let mnoznik = 1 + (gracz.negocjacja * 0.1);
                                let cenaKoncowa = Math.floor(p.wartosc * mnoznik);
                                let bonus = cenaKoncowa - p.wartosc;

                                gracz.zloto += cenaKoncowa;
                                console.log(`Sprzedano ${p.nazwa} za ${cenaKoncowa} złota`);
                                if (bonus > 0) console.log(`Bonus z negocjacji: +${bonus} zł (Poziom: ${gracz.negocjacja})`);
                                gracz.plecak.splice(idx, 1);
                            } else {
                                console.log("Nikt nie chce kupić tego przedmiotu");
                            } 
                        }
                        
                    } 
                    } else if (wybor === "9"){
                                await MenuRozwoju(gracz);
                            } else if (wybor === "10"){
                                await TablicaZgloszen(gracz);
                            }
            }

            if (przeciwnik.hp <= 0) {
                console.log(`\nZwycięstwo!`);
                gracz.zloto += przeciwnik.nagroda;
                gracz.exp += przeciwnik.exp;

                if (aktywneZlecenie && aktywneZlecenie.cel === przeciwnik.imie) {
                    console.log(`Zlecenie wykonane: ${aktywneZlecenie.nazwa}`);
                    gracz.zloto += aktywneZlecenie.nagrodazadania;
                    console.log(`Odebrałeś nagrodę z tablicy: +${aktywneZlecenie.nagrodazadania} złota!`);
                    aktywneZlecenie = null;
                }

                  sprawdzAwans(gracz);
                    
                if (przeciwnik.drop) {
                    let szansaKoncowa = przeciwnik.drop.szansa + (gracz.wzrok * 5);
                    if (szansaKoncowa > 100) szansaKoncowa = 100;
                    if (czyTrafiony(szansaKoncowa)){
                        gracz.plecak.push(przeciwnik.drop);
                        console.log("--------------");
                        console.log(`Zebrano łup: ${przeciwnik.drop.nazwa}`);
                        console.log(`Dzieki twojemu sokolemu oku (wzrok: ${gracz.wzrok}) szanswa wzrosła do ${szansaKoncowa}%`);
                        console.log("--------------");
                    } else {
                        console.log(`Przeszukujesz zwłoki ${przeciwnik.imie}, ale nic nie znajdujesz (Szansa była: ${szansaKoncowa}%)`);
                    }
                }
                break; 
            }

            WykonajAtak(przeciwnik, gracz);

            if (gracz.hp <= 0) {
                console.log("Gerald poległ...");
                readline.close();
                return; 
            }
        }
        await Sklep(gracz);
        await LosoweZdarzenie(gracz);
        await question("\nNaciśnij Enter, aby iść dalej...");
    }
    console.log("\nGratulacje! Przeszedłeś całą grę!");
    client.end();
    readline.close();
}
main();