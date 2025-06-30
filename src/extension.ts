// src/extension.ts
import * as vscode from 'vscode';

// Nuova struttura di normalizzazione
const normalizzazioneDB = [
    {
        concetto: "enjambement",
        lemma: "inarcatura",
        forme: ["inarcature", "inarcamenti", "inarcare"]
    },
    {
        concetto: "enjambement",
        lemma: "slittamento",
        forme: ["slittamenti", "slittare"]
    },
    {
        concetto: "metafora",
        lemma: "traslato",
        forme: ["traslazione", "traslati", "metafore"]
    }
];

function levenshteinDistance(s1: string, s2: string): number {
    const dp: number[][] = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(0));
    for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
    for (let j = 0; j <= s2.length; j++) dp[0][j] = j;
    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }
    return dp[s1.length][s2.length];
}

function trovaNormalizzazione(parola: string): { label: string, lemma: string, ref: string }[] {
    const risultati: { label: string, lemma: string, ref: string }[] = [];
    for (const entry of normalizzazioneDB) {
        if (entry.forme.includes(parola)) {
            risultati.push({
                label: `${parola} (forma) → ${entry.concetto}`,
                lemma: entry.lemma,
                ref: `http://example.org/skos/${entry.concetto}`
            });
        } else if (entry.lemma === parola) {
            risultati.push({
                label: `${parola} (lemma) → ${entry.concetto}`,
                lemma: entry.lemma,
                ref: `http://example.org/skos/${entry.concetto}`
            });
        }
    }
    return risultati;
}

function suggerimentiSimili(parola: string): { label: string, lemma: string, ref: string }[] {
    const tutteForme = normalizzazioneDB.flatMap(entry =>
        entry.forme.map(f => ({ tipo: "forma", forma: f, lemma: entry.lemma, concetto: entry.concetto }))
    );
    const punteggiati = tutteForme.map(f => ({
        ...f,
        distanza: levenshteinDistance(parola, f.forma)
    }));
    return punteggiati
        .sort((a, b) => a.distanza - b.distanza)
        .slice(0, 5)
        .map(p => ({
            label: `${p.forma} (forma) → ${p.concetto}`,
            lemma: p.lemma,
            ref: `http://example.org/skos/${p.concetto}`
        }));
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
        let opzioni = trovaNormalizzazione(normalizzata);

        if (opzioni.length === 0) {
            opzioni = suggerimentiSimili(normalizzata);
        }

        const quickPickItems = opzioni.map(opt => ({
            label: opt.label,
            lemma: opt.lemma,
            ref: opt.ref
        }));

        quickPickItems.push(
            { label: 'sconosciuto', lemma: 'sconosciuto', ref: '' },
            { label: 'manuale', lemma: '', ref: '' }
        );

        const scelta = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: `Seleziona il valore per "${selectedText}"`,
            canPickMany: false
        });

        if (!scelta) return;

        let taggedText = '';

        if (scelta.label === 'manuale') {
            const manuale = await vscode.window.showInputBox({
                prompt: 'Inserisci manualmente il valore per l\'attributo lemma'
            });
            if (!manuale) return;
            taggedText = `<w xml:id="w1" lemma="${manuale}">${selectedText}</w>`;
        } else if (scelta.label === 'sconosciuto') {
            taggedText = `<w xml:id="w1" lemma="sconosciuto">${selectedText}</w>`;
        } else {
            taggedText = `<w xml:id="w1" lemma="${scelta.lemma}" ref="${scelta.ref}">${selectedText}</w>`;
        }

        editor.edit(editBuilder => {
            editBuilder.replace(editor.selection, taggedText);
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
