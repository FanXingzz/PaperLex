# Third-party notices

PaperLex application code and the small curated teaching lexicon are independently written. The teaching examples are not quotations from scientific papers.

- PDF.js / pdfjs-dist: Apache-2.0. License supplied with the dependency, https://github.com/mozilla/pdf.js/blob/master/LICENSE .
- Playwright: Apache-2.0, development and testing only, https://github.com/microsoft/playwright/blob/main/LICENSE .
- Free Dictionary API: https://dictionaryapi.dev/ . Dictionary responses may carry their own source and license (often Wiktionary / CC BY-SA). The application displays the source and license returned by the API. Audio URLs may have separate licenses returned by the service. Dictionary data and audio are not bundled with this repository.
- MyMemory: online translation service, https://mymemory.translated.net/doc/spec.php . Requests are subject to the service's terms and limits.
- OpenAlex: scholarly metadata and available abstracts, https://help.openalex.org/api/ . Source links accompany search results; content availability varies by work.
- Interaction concepts referenced from https://github.com/HongMai1016/kaoyan-english-review : sentence-level context search and a separate personal vocabulary collection. No source code or examination corpus was copied.

Do not commit the local data directory, API keys, imported papers, learning exports, or provider credentials to a public repository. Use `.gitignore` exclusions and review the staged file list before publishing.
