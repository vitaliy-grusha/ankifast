# Ankifast

## Description

Ankifast is a plugin for [Obsidian](https://obsidian.md) that allows you to export notes to a CSV format that Anki can import.

Features: 

- markdown to html transformation
- code blocks with syntax highlighting to html transformation
- LaTeX transformation

Limitation: any other text outside the given structure may cause the plugin to work incorrectly.

## Structure

First, create note with such structure (use Ctrl+Shift+D or Command+Shift+D):

```
##### content

[here can be your content]

##### questions
###### Question?
```

In this structure, the text after the keyword `##### content` is recognized as the back of the card, and text `Question?` as the front.

Each block of content can have many questions, for example:

```
##### content

[here can be your content]

##### questions
###### What is A?
###### What is B?
###### What is C?
```

This generates 3 cards with different front side and same back side.

Also, there is an options to provide specific answer to each quesion:

```
##### content

[here can be your content]

##### questions
###### What is A?
###### What is B?
Answer for B.
###### What is C?
Answer for C.
```

This generates 3 cards where the first has the content on the back and the other 2 have the answers on the back.

Then, to export it to Anki use Ctrl + P(or Command+P) in Obsidian. find command "Ankifast: Export to Anki" and execute it. This command will create a CSV-structured export-to-anki-[original-filename].txt file that Anki can import.

## License

Ankifast is [MIT licensed](LICENSE).
