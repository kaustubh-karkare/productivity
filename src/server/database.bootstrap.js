import { createCategoryTemplate } from '../data/LogCategory';
import { LogEntry, getNegativeID } from '../data';

const data = {
    categories: [
        {
            name: 'Cycling',
            logKeys: [
                { name: 'Distance (miles)', type: 'integer' },
                { name: 'Time (minutes)', type: 'integer' },
                { name: 'Calories', type: 'integer' },
            ],
            template: 'Cycling: $1 miles / $2 minutes ({Math.floor(100*$1*60/$2)/100} mph)',
        },
        {
            name: 'Surya Namaskar',
            logKeys: [
                { name: 'Surya Namaskar Count', type: 'integer' },
            ],
            template: 'Surya Namaskar: $1',
        },
        {
            name: 'Food',
            logKeys: [
                { name: 'Food Name', type: 'string' },
                { name: 'Food Quantity', type: 'string' },
            ],
            template: 'Food: $1 ($2)',
        },
        {
            name: 'Book',
            logKeys: [
                { name: 'Book Name', type: 'string' },
                { name: 'Progress', type: 'string' },
            ],
            template: 'Book: $1 ($2)',
        },
        {
            name: 'Movie',
            logKeys: [
                { name: 'Movie Name', type: 'string' },
            ],
            template: 'Movie: $1',
        },
        {
            name: 'Television',
            logKeys: [
                { name: 'Show Name', type: 'string' },
                { name: 'Progress', type: 'string' },
            ],
            template: 'TV: $1 ($2)',
        },
        {
            name: 'Article',
            logKeys: [
                { name: 'Name', type: 'string' },
                { name: 'Link', type: 'string' },
            ],
            template: 'Article: $1',
        },
    ],
    logTags: [
        {
            type: 'person',
            name: 'Anurag Dubey',
        },
        {
            type: 'person',
            name: 'Kaustubh Karkare',
        },
        {
            type: 'person',
            name: 'Vishnu Mohandas',
        },
    ],
    logEnties: [
        {
            categoryName: 'Cycling',
            logValues: ['15', '55', '750'],
        },
        {
            categoryName: 'Cycling',
            logValues: ['20', '70', '1000'],
        },
    ]
};

function awaitSequence(items, method) {
    return new Promise((resolve, reject) => {
        let index = 0;
        const results = [];
        const next = () => {
            if (index === items.length) {
                resolve(results);
            } else {
                method(items[index], index, items)
                    .then((result) => {
                        results.push(result);
                        index += 1;
                        next();
                    })
                    .catch((error) => reject(error));
            }
        };
        next();
    });
}

async function bootstrap(actions, database) {
    const context = { database };
    const categoryMap = {};

    await awaitSequence(data.categories, async (inputLogCategory) => {
        inputLogCategory.id = getNegativeID();
        inputLogCategory.logKeys = inputLogCategory.logKeys.map(
            (logKey) => ({ ...logKey, id: getNegativeID() }),
        );
        inputLogCategory.template = createCategoryTemplate(
            inputLogCategory.template, inputLogCategory.logKeys
        );
        const outputLogCategory = await actions['log-category-upsert']
            .call(context, inputLogCategory);
        categoryMap[outputLogCategory.name] = outputLogCategory;
    });
    await awaitSequence(data.logTags, async (logTag) => {
        logTag.id = getNegativeID();
        return actions['log-tag-upsert'].call(context, logTag);
    });
    await awaitSequence(data.logEnties, async (inputLogEntry, index) => {
        inputLogEntry.id = getNegativeID();
        inputLogEntry.logCategory = categoryMap[inputLogEntry.categoryName];
        inputLogEntry.logValues = inputLogEntry.logValues.map(
            (data, index) => ({
                id: getNegativeID(),
                logKey: inputLogEntry.logCategory.logKeys[index],
                data,
            })
        );
        inputLogEntry.details = '';
        LogEntry.trigger(inputLogEntry); // set title
        const outputLogEntry = await actions['log-entry-upsert']
            .call(context, inputLogEntry);
    });
}

export default bootstrap;
