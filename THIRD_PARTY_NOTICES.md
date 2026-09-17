# Third-party notices

PaperLex application code and the small curated teaching lexicon are independently written. The teaching examples are not quotations from scientific papers.

- PDF.js / pdfjs-dist: Apache-2.0. License supplied with the dependency, https://github.com/mozilla/pdf.js/blob/master/LICENSE .
- Playwright: Apache-2.0, development and testing only, https://github.com/microsoft/playwright/blob/main/LICENSE .
- Free Dictionary API: https://dictionaryapi.dev/ . Dictionary responses may carry their own source and license (often Wiktionary / CC BY-SA). The application displays the source and license returned by the API. Audio URLs may have separate licenses returned by the service. Dictionary data and audio are not bundled with this repository.
- MyMemory: online translation service, https://mymemory.translated.net/doc/spec.php . Requests are subject to the service's terms and limits.
- OpenAlex: scholarly metadata and available abstracts, https://help.openalex.org/api/ . Source links accompany search results; content availability varies by work.
- Europe PMC: metadata and available open full-text XML, https://europepmc.org/RestfulWebService . Retrieved article passages remain subject to each article's license and are cached locally, not bundled with this repository.
- Semantic Scholar Academic Graph: public paper search, https://api.semanticscholar.org/api-docs/ . Availability and rate limits are controlled by the provider.
- arXiv: supported open PDF links are downloaded on request from https://arxiv.org/ and parsed locally. Each paper retains its authorship and license. No articles are redistributed in the source repository.
- Interaction concepts referenced from https://github.com/HongMai1016/kaoyan-english-review : sentence-level context search and a separate personal vocabulary collection. No source code or examination corpus was copied.

Do not commit the local data directory, API keys, imported papers, learning exports, or provider credentials to a public repository. Use `.gitignore` exclusions and review the staged file list before publishing.

- ipa-dict, https://github.com/open-dict-data/ipa-dict : English UK and US IPA wordlists, MIT Copyright (c) 2016 dohliam. Original license retained in resources/IPA-LICENSE.txt and pinned source revision in resources/IPA-SOURCE.json. The original tab-separated files are gzip-compressed without changing their entries.

- WordNet 3.1 via wordnet-db 3.1.14, https://github.com/moos/wordnet-db and https://wordnet.princeton.edu/ : local fallback English senses and examples. Package MIT license and Princeton WordNet database license retained in node_modules/wordnet-db/LICENSE. Source attribution accompanies each sense; Chinese is machine translated.

- PyMuPDF 1.26.4 / MuPDF: optional local PDF comparison renderer, dual licensed under GNU AGPL v3 or an Artifex commercial license. Project: https://github.com/pymupdf/PyMuPDF . Package notices and font licenses remain in .pdf-runtime/packages.
- Python 3.12.10 embeddable distribution: Python Software Foundation license; installer downloads from python.org and retains LICENSE.txt in .pdf-runtime/python.

- ECDICT (skywind3000): https://github.com/skywind3000/ECDICT, MIT license. Pinned source revision, SHA-256 and retained record count are in resources/ECDICT-SOURCE.json; original license in resources/ECDICT-LICENSE.txt. Compressed local dataset retains Chinese translations, English definitions, phonetics and word forms; used for offline dictionary lookup.

- OpenAI API and DeepL API: optional remote services using user-provided credentials. Provider terms, account limits and billing apply; no credentials or translated papers are bundled. https://developers.openai.com/ and https://developers.deepl.com/ .
