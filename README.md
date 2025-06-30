# lemmatizerTEI
A VisualStudio Code extension for assisted lemmatization of TEI documents.


 
We have 


|Occorrenza    | Lemma       | Concetto  |
|--------------|-------------|-----------|
|inarcature    |inarcatura   |enjambement|
|trasmutationi |trasmutatione|hyperbaton |
|versi         |verso        |verso      |
|riposo        |riposo       |pausa      |
|aspro         |asprezza     |asprezza   |

## Local testing

```
npm install
npm run compile
```
Select the `extension.ts` file in the `src` folder.
Run > Start Debugging


Ora si può aprire un file XML e testare mettendo il cursore Ctrl + Alt + T (o Cmd + Alt + T su Mac)

```xml
<p>
  L'autore usa molte
  <w xml:id="w1" lemma="inarcatura" ref="http://example.org/skos/enjambement">inarcature</w>
  nella parte finale.
</p>
```