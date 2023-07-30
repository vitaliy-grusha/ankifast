import { Editor, Plugin } from "obsidian";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

interface Question {
  title: string;
  answer: string | null;
}
interface Card {
  content: string;
  question: Question[];
}

const hashCode = (s: string) =>
  s.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

const EXPORT_FILENAME_EXTENSION = "txt";
const EXPORT_FILENAME_PREFIX = "export-to-anki-";
const CONTENT_KEYWORD = "##### content";
const QUESTIONS_KEYWORD = "##### questions";
const QUESTIONS_PREFIX = "###### ";
const DEFAULT_QUESTION_CONTENT = "Question?";
const DEFAULT_QUESTION = `${QUESTIONS_PREFIX}${DEFAULT_QUESTION_CONTENT}`;
const TEMPLATE = `${CONTENT_KEYWORD}



${QUESTIONS_KEYWORD}
${DEFAULT_QUESTION}`;

const markdown: MarkdownIt = MarkdownIt({
  html: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          '<pre><code class="hljs">' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          "</code></pre>"
        );
      } catch (__) {
        //
      }
    }
    return (
      '<pre><code class="hljs">' +
      markdown.utils.escapeHtml(str) +
      "</code></pre>"
    );
  },
});

export default class Ankifast extends Plugin {
  async onload() {
    this.addCommand({
      id: "ankifast-add-template",
      name: "Add template",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "d" }],
      editorCallback: (editor: Editor) => {
        editor.replaceSelection(TEMPLATE);
        editor.focus();
        editor.setCursor({
          line: editor.getCursor().line - 3,
          ch: 0,
        });
      },
    });

    this.addCommand({
      id: "ankifast-to-anki",
      name: "Export to Anki",
      editorCallback: (editor: Editor) => {
        let isSelection = false;
        const cards: Card[] = [];
        let cardsContent = "";
        if (editor.somethingSelected()) {
          cardsContent = editor.getSelection();
          isSelection = true;
        } else cardsContent = editor.getValue();

        const countContentRegExp = new RegExp(
          `${CONTENT_KEYWORD.replace("#", "[#]")}`,
          "g"
        );
        const countQuestionsRegExp = new RegExp(
          `${QUESTIONS_KEYWORD.replace("#", "[#]")}`,
          "g"
        );

        const contentHeaderCount = (
          cardsContent.match(countContentRegExp) || []
        ).length;
        const questionsHeaderCount = (
          cardsContent.match(countQuestionsRegExp) || []
        ).length;

        if (contentHeaderCount != questionsHeaderCount) {
          alert(
            `Error: content(${contentHeaderCount}) and questions(${questionsHeaderCount}) headers mismatch`
          );
          return;
        }

        while (cardsContent.indexOf(CONTENT_KEYWORD) != -1) {
          const card: Card = {
            content: "",
            question: [],
          };
          let index: number | undefined = cardsContent.indexOf(
            CONTENT_KEYWORD
          );
          cardsContent = cardsContent.substring(
            index + CONTENT_KEYWORD.length
          );
          index = cardsContent.indexOf(CONTENT_KEYWORD);

          if (index != -1) {
            index = index + CONTENT_KEYWORD.length;
          } else index = undefined;

          let cardBody = cardsContent.substring(0, index);

          index = cardBody.indexOf(QUESTIONS_KEYWORD);
          card.content = cardBody.substring(0, index).trim();
          index = cardBody.indexOf(QUESTIONS_KEYWORD);
          cardBody = cardBody.substring(index + QUESTIONS_KEYWORD.length);
          while (cardBody.indexOf(QUESTIONS_PREFIX) != -1) {
            const question: Question = {
              title: "",
              answer: null,
            };
            index = cardBody.indexOf(QUESTIONS_PREFIX);
            cardBody = cardBody.substring(
              index + QUESTIONS_PREFIX.length
            );

            question.title = cardBody.split(/\r?\n|\r|\n/g)[0];

            if (question.title == DEFAULT_QUESTION_CONTENT) {
              continue;
            }

            index = cardBody.indexOf(question.title);
            cardBody = cardBody.substring(index + question.title.length);

            index = cardBody.indexOf(QUESTIONS_PREFIX);
            if (index == -1) {
              index = cardBody.indexOf(CONTENT_KEYWORD);
            }
            if (index == -1) {
              index = 0;
            }

            question.answer = cardBody.substring(0, index).trim();
            if (question.answer.length == 0) question.answer = null;
            card.question.push(question);
          }
          cards.push(card);
        }
        (async () => {
          const renderToHtml = async (content: string) => {
            return (await markdown.render(content)).replace(/\n/g, "");
          };

          const escapeLatexSpace = (latex: string) => {
            const spaces = ["\\\\;", "\\\\:", "\\\\,", "\\\\!"];

            for (let index = 0; index < spaces.length; index++) {
              const element = spaces[index];
              latex = latex.replace(new RegExp(element, 'g'), "\\" + element);
            }

            return latex;
          };

          const replaceLatex = (content: string) => {
            const latexBlockRegExp = /\$\$(.*?)\$\$/g;
            const latexInlineRegExp = /\$.*?\$/g;

            if (latexBlockRegExp.test(content)) {
              const matches = content.match(latexBlockRegExp);
              if (matches) {
                for (let index = 0; index < matches.length; index++) {
                  const match = matches[index];
                  const latexContent = match.split("$$")[1];
                  content = content.replace(
                    match,
                    "[latex]\\begin{displaymath}" +
                      escapeLatexSpace(latexContent) +
                      "\\end{displaymath}[/latex]"
                  );
                }
              }
            }

            if (latexInlineRegExp.test(content)) {
              const matches = content.match(latexInlineRegExp);
              if (matches) {
                for (let index = 0; index < matches.length; index++) {
                  const match = matches[index];
                  const latexContent = match.split("$")[1];
                  content = content.replace(
                    match,
                    "[latex]\\begin{math}" +
                      escapeLatexSpace(latexContent) +
                      "\\end{math}[/latex]"
                  );
                }
              }
            }

            return content;
          };

          let exportedContent = "";
          for (let index = 0; index < cards.length; index++) {
            const card = cards[index];
            for (
              let indexQuestion = 0;
              indexQuestion < card.question.length;
              indexQuestion++
            ) {
              const question = card.question[indexQuestion];
              let content = "";
              let title = "";
              if (question.answer != null) {
                content = question.answer;
              } else content = card.content;

              content = replaceLatex(content);
              content = await renderToHtml(content);
              
              title = replaceLatex(question.title);
              title = await renderToHtml(title);
              
              exportedContent = exportedContent + title + `\t${content}\n`;
            }
          }

          const root = this.app.vault.getRoot();
          const currentFile = this.app.workspace.getActiveFile();
          if (currentFile == null) {
            alert(`Error: active file not found.`);
            return;
          }
          let filename = "";

          if (!isSelection) {
            filename =
              EXPORT_FILENAME_PREFIX +
              currentFile.name +
              `.${EXPORT_FILENAME_EXTENSION}`;
          } else {
            filename =
              EXPORT_FILENAME_PREFIX +
              hashCode(cardsContent) +
              "-" +
              currentFile.name +
              `.${EXPORT_FILENAME_EXTENSION}`;
          }

          const filePath = root.path + filename;
          const file = this.app.vault
            .getFiles()
            .find((el) => el.name == filename);
          if (file != undefined) {
            await this.app.vault.modify(file, exportedContent);
          } else {
            await this.app.vault.create(filePath, exportedContent);
          }

          alert(
            `Exported ${
              isSelection ? "selection" : "content"
            } to ${filename} file.`
          );
        })();
      },
    });
  }

  onunload() {}
}
