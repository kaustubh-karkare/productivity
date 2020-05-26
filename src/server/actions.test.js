import Database from './database';
import Actions from './actions';

let actions = null;

beforeAll(async () => {
    const config = {
        "type": "sqlite",
        "host": "localhost",
        "username": "productivity_test",
        "password": "productivity_test",
        "name": "productivity_test"
    };
    const database = await Database.init(config)
    actions = new Actions(database);
});

afterAll(async () => {
    await actions.database.close();
});

test("basic_operations", async () => {
    const models = actions.database.models;

    const key1 = await actions.genCreateLSDKey({name: 'Size', value_type: 'string'});
    const key2 = await actions.genCreateLSDKey({name: 'Legs', value_type: 'integer'});
    const category = await actions.genCreateCategory({name: 'Animal'});
    await actions.genSetCategoryKeys({category_id: category.id, lsd_key_ids: [key1.id, key2.id]});
    await expect(() => key1.destroy()).rejects.toThrow(); // SequelizeForeignKeyConstraintError
    await expect(() => category.destroy()).rejects.toThrow(); // SequelizeForeignKeyConstraintError

    const log1 = await actions.genCreateLogEntry({
        title: 'Cat',
        details: 'Meow!',
        category_id: category.id,
        lsd_values: [
            {lsd_key_id: key1.id, value_data: 'small'},
            {lsd_key_id: key2.id, value_data: '4'},
        ],
    });
    const log2 = await actions.genCreateLogEntry({
        title: 'Dog',
        details: 'Bark!',
        category_id: category.id,
        lsd_values: [
            {lsd_key_id: key1.id, value_data: 'medium'},
            {lsd_key_id: key2.id, value_data: '4'},
        ],
    });
    expect((await models.LogEntryToLSDValue.findAll()).length).toEqual(4);
    await log1.destroy();
    expect((await models.LogEntryToLSDValue.findAll()).length).toEqual(2);
    expect((await models.LSDValue.findAll()).length).toEqual(3);
});
