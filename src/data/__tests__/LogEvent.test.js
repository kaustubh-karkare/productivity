import Utils from './Utils';

beforeEach(Utils.beforeEach);
afterEach(Utils.afterEach);

test('test_structure_constraint', async () => {
    await Utils.loadData({
        logStructureGroups: [
            { name: 'Testing' },
        ],
        logStructures: [
            {
                groupName: 'Testing',
                name: 'Animals',
                logKeys: [
                    { name: 'Size', type: 'string' },
                    { name: 'Legs', type: 'integer' },
                ],
            },
        ],
        logEvents: [
            {
                date: '2020-06-28',
                title: 'Cat',
                structureName: 'Animals',
                logValues: ['small', '4'],
            },
        ],
    });

    const actions = Utils.getActions();
    await expect(() => actions.invoke('log-structure-delete', 1)).rejects.toThrow();
    await actions.invoke('log-event-delete', 1);
    await actions.invoke('log-structure-delete', 1);
});

test('test_event_update', async () => {
    await Utils.loadData({
        logStructureGroups: [
            { name: 'Testing' },
        ],
        logStructures: [
            {
                groupName: 'Testing',
                name: 'Animals',
                logKeys: [
                    { name: 'Size', type: 'string' },
                    { name: 'Legs', type: 'integer' },
                ],
            },
        ],
        logEvents: [
            {
                date: '2020-06-28',
                title: 'Cat',
                structureName: 'Animals',
                logValues: ['small', '4'],
            },
        ],
    });

    const actions = Utils.getActions();

    const logEvent = await actions.invoke('log-event-load', { id: 1 });
    logEvent.title = 'Dog';
    logEvent.logStructure.logKeys[0].value = 'medium';
    await actions.invoke('log-event-upsert', logEvent);
});

test('test_log_event_value_typeahead', async () => {
    await Utils.loadData({
        logStructureGroups: [
            { name: 'Testing' },
        ],
        logStructures: [
            {
                groupName: 'Testing',
                name: 'Animals',
                logKeys: [
                    { name: 'Size', type: 'string' },
                    { name: 'Legs', type: 'integer' },
                ],
            },
        ],
        logEvents: [
            {
                date: '2020-06-28',
                title: 'Cat',
                structureName: 'Animals',
                logValues: ['small', '4'],
            },
        ],
    });

    const actions = Utils.getActions();
    let logValueSuggestions;

    const logEvent = await actions.invoke('log-event-load', { id: 1 });
    const input = { structure_id: logEvent.logStructure.id, index: null, query: '' };

    logValueSuggestions = await actions.invoke('value-typeahead', { ...input, index: 0 });
    expect(logValueSuggestions).toEqual(['small']);

    logValueSuggestions = await actions.invoke('value-typeahead', { ...input, index: 1 });
    expect(logValueSuggestions).toEqual(['4']);
});
