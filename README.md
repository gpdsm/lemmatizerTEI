# lemmatizerTEI
A VisualStudio Code extension for assisted lemmatization of TEI documents.


|Occorrenza    | Lemma       | Concetto  |
|--------------|-------------|-----------|
|inarcature    |inarcatura   |enjambement|
|trasmutationi |trasmutatione|hyperbaton |
|versi         |verso        |verso      |
|riposo        |riposo       |pausa      |
|aspro         |asprezza     |asprezza   |

## Local testing

Una volta entrati nella cartella dell'applicazione:
```
npm install
npm run compile
```
Open VisualStudio Code and select the `extension.ts` file in the `src` folder.

Run > Start Debugging

Ora si può aprire un file XML e testare mettendo il cursore Ctrl + Alt + T (o Cmd + Alt + T su Mac)

```xml
<p>
  L'autore usa molte
  <w xml:id="w1" lemma="inarcatura" ref="http://example.org/skos/enjambement">inarcature</w>
  nella parte finale.
</p>
```
