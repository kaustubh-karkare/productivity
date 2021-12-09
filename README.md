## Generic Life Activity Data Organization System (GLADOS)

### Rationale
* In the past, I have tried using various todo-list apps (including [building my own](https://github.com/kaustubh-karkare/todolist)), but none of them really worked out for me: the motivation never seemed to last beyond a few days. But the idea of an anti-todo/done-list seemed pretty interesting when I first encountered it in some blog post (maybe [this one](https://www.fastcompany.com/3034785/why-an-anti-to-do-list-might-be-the-secret-to-productivity)?).
* Additionally, back then, it was fairly easy to measure my productivity at work in terms of the amount of code generated, so I would only make notes about important/memorable events. But in the last couple of years, as my job has evolved, that metric is no longer a useful proxy for my effectiveness. This transition strongly correlated with an increasing reliance on these done-lists to feel satisfied at the end of the day.
* I have been using Evernote to manage these notes/lists for a few years, and now that I have a good understanding of how I like to use the tool, I find myself wishing for the ability to add more structure to the data being generated, so that I can do some interesting things with it.
* Looking at the options available online, I did not find anything that did everything I was hoping for, and more importantly, it hurts my pride as a [Software Engineer](https://www.linkedin.com/in/kaustubh-karkare/) to pay for something I know I can build. As a result, this tool might not be suited to a larger audience, but it will work for me :)

### Installation

```
git clone https://github.com/kaustubh-karkare/glados
cp config.json.example config.json
mkdir data
yarn install
yarn run database-reset
```

* The default `config.json` file specifies the `data` subdirectory as the location of the SQLite database and the backups.
* I personally made my `data` a symlink to another directory that synced to my [Dropbox](https://www.dropbox.com/).

### Usage

```
yarn run build-client
yarn run server
```

### Backups

```
yarn run backup-save  # Can also be done via the right-sidebar in the UI.
yarn run backup-load  # This involves a database reset, so be careful!
```

* Backup files are created by loading the entire database into memory and then writing that as a JSON file.
* This makes it very easy to apply transformations on the entire database when needed. Eg - if new columns are added, or the data needs to be reorganized.
* These are also useful if data needs to be moved from one storage to another.

Backup File Size Estimation?
* (50 events / day) * (365 days / year) * (10 years) * (1 kilobyte / event) = 182,500,000 bytes < 200 MB for 10 years.
* Note that the above estimation does not include other data types, but those are infrequently created, and not separately counted.
* The total size can reduced significantly by compressing the backup file if needed. JSON was picked for human readability, not for space efficiency.

### Warning!

* This tool is continuously being modified as I discover what works for me and what doesn't. This includes changes to not only the UI, but to the database schema too. I do NOT plan to support automatic data migrations when these database modifications happen.
* You will need to write code to update your backup to make it compatible with the new version of code as needed. If you are unable to do so, I do not recommend using this tool.
