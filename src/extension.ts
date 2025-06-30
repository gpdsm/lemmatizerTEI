// src/extension.ts
import * as vscode from 'vscode';

// Simulazione database in questo caso ho il lemma od occorrenza
const normalizzazioneDB: Record<string, string> = {
    "cane": "canide",
    "gatto": "felino",
    "cavallo": "equide",
    "pesce": "ittico",
    "uccello": "ornitologico",
};
// prima forse devo cercare nei lemmi, poi nei sinonimi, poi nella lista di parole
// Lista di parole da usare per la ricerca della parola più vicina
const myWordList: string[] = ["mela", "pera", "banana", "mare", "pane", "melo"];

// Implementazione della Distanza di Levenshtein
// Fonte: https://en.wikipedia.org/wiki/Levenshtein_distance#Iterative_with_full_matrix
function levenshteinDistance(s1: string, s2: string): number {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) {
            costs[s2.length] = lastValue;
        }
    }
    return costs[s2.length];
}

function findClosestWord(targetWord: string, wordList: string[]): string | null {
    if (wordList.length === 0) {
        return null; // La lista è vuota
    }

    let closestWord: string = wordList[0];
    let minDistance: number = levenshteinDistance(targetWord, wordList[0]);

    for (let i = 1; i < wordList.length; i++) {
        const currentWord = wordList[i];
        const currentDistance = levenshteinDistance(targetWord, currentWord);

        if (currentDistance < minDistance) {
            minDistance = currentDistance;
            closestWord = currentWord;
        }
    }
    vscode.window.showInformationMessage(`Parola più vicina a "${targetWord}": ${closestWord}`);

    return closestWord;
}


export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('lemmatizerTEI.tagWord', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.selection;
        let selectedText = editor.document.getText(selection);

        if (!selectedText) {
            const position = selection.active;
            const wordRange = editor.document.getWordRangeAtPosition(position);
            if (!wordRange) {
                vscode.window.showInformationMessage('Nessuna parola trovata sotto il cursore.');
                return;
            }
            selectedText = editor.document.getText(wordRange);
            editor.selection = new vscode.Selection(wordRange.start, wordRange.end);
        }

        const normalizzata = selectedText.toLowerCase();
        let altValueSuggestion: string | null = null; // Il valore che suggeriremo per 'alt'

        // Logica di ricerca della normalizzazione:

        // TENTATIVO 1: Corrispondenza esatta nel normalizzazioneDB
        if (normalizzazioneDB[normalizzata]) {
            altValueSuggestion = normalizzazioneDB[normalizzata];
            vscode.window.showInformationMessage(`Trovata corrispondenza esatta nel DB: ${altValueSuggestion}`);
        } else {
            // TENTATIVO 2: Nessuna corrispondenza esatta. Cerchiamo la parola più vicina.
            // Dove cerchiamo la parola più vicina?
            // OPTION A: Nelle CHIAVI del normalizzazioneDB (es. per correggere "cani" a "cane" -> "canide")
            const dbKeys = Object.keys(normalizzazioneDB);
            const closestKeyInDb = findClosestWord(normalizzata, dbKeys);

            // OPTION B: Nella myWordList generica (se myWordList contiene un vocabolario di lemmi/sinonimi alternativi)
            // const closestWordInMyList = findClosestWord(normalizzata, myWordList);

            // Decidi quale usare o come combinare.
            // Qui useremo closestKeyInDb, applicando una soglia per accettare un match come "vicino"
            const LEVENSHTEIN_THRESHOLD = 2; // Distanza massima accettabile per considerare "vicino"

            if (closestKeyInDb !== null && levenshteinDistance(normalizzata, closestKeyInDb) <= LEVENSHTEIN_THRESHOLD) {
                altValueSuggestion = normalizzazioneDB[closestKeyInDb]; // Prendi il valore normalizzato dalla chiave vicina
                vscode.window.showInformationMessage(`Nessuna esatta. Trovata parola simile ("${closestKeyInDb}") nel DB: ${altValueSuggestion}`);
            } else {
                // Se non troviamo una chiave vicina valida nel DB, potremmo cercare in myWordList
                // OPPURE decidere che non c'è una normalizzazione automatica.
                const closestWordInMyList = findClosestWord(normalizzata, myWordList);
                if (closestWordInMyList !== null && levenshteinDistance(normalizzata, closestWordInMyList) <= LEVENSHTEIN_THRESHOLD) {
                    altValueSuggestion = closestWordInMyList; // Qui suggerisci la parola vicina stessa
                    vscode.window.showInformationMessage(`Nessuna esatta nel DB. Trovata parola simile in myWordList: ${altValueSuggestion}`);
                } else {
                     vscode.window.showInformationMessage(`Nessuna corrispondenza automatica o parola vicina trovata.`);
                     altValueSuggestion = null; // Nessun suggerimento automatico
                }
            }
        }

        // Ora costruiamo le opzioni per il QuickPick
        const opzioni: string[] = [];
        if (altValueSuggestion) {
            opzioni.push(altValueSuggestion);
        }
        opzioni.push('sconosciuto', 'manuale'); // Queste sono sempre disponibili

        const scelta = await vscode.window.showQuickPick(opzioni, {
            placeHolder: `Seleziona il valore da usare per 'alt' per "${selectedText}"`,
            canPickMany: false
        });

        if (scelta === undefined) {
            vscode.window.showInformationMessage('Nessuna scelta effettuata.');
            return;
        }

        let altValue = scelta;

        if (scelta === 'manuale') {
            const manuale = await vscode.window.showInputBox({
                prompt: 'Inserisci manualmente il valore per l\'attributo alt'
            });
            if (!manuale) return;
            altValue = manuale;
        }

        const taggedText = `<w lemma="${altValue}">${selectedText}</w>`;

        editor.edit(editBuilder => {
            editBuilder.replace(editor.selection, taggedText);
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}