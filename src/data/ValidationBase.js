
class ValidationBase {
    static validateNonEmptyString(name, value) {
        if (typeof value !== 'string') {
            return [
                name,
                false,
                'must be a string.',
            ];
        }
        return [
            name,
            value.length > 0,
            'must be non-empty.',
        ];
    }

    static validateEnumValue(name, value, Enum) {
        return [
            name,
            !!Enum[value],
            'must be valid.',
        ];
    }

    static validateUsingLambda(name, value, method) {
        if (!method) {
            return [
                name,
                false,
                'is missing a validator.',
            ];
        }
        if (value.length === 0) {
            return [
                name,
                false,
                'must be non-empty.',
            ];
        }
        return [
            name,
            method(value),
            'fails validation for specified type.',
        ];
    }

    static async validateRecursive(DataType, name, item) {
        const result = await DataType.validateInternal(item);
        const prefix = name;
        for (let jj = 0; jj < result.length; jj += 1) {
            result[jj][0] = prefix + result[jj][0];
        }
        return result;
    }

    static async validateRecursiveList(DataType, name, items) {
        if (!Array.isArray(items)) {
            return [
                name,
                false,
                `must be an Array<${DataType.name}>`,
            ];
        }
        const results = await Promise.all(
            items.map((item) => DataType.validateInternal(item)),
        );
        for (let ii = 0; ii < results.length; ii += 1) {
            const prefix = `${name}[${ii}]`;
            for (let jj = 0; jj < results[ii].length; jj += 1) {
                results[ii][jj][0] = prefix + results[ii][jj][0];
            }
        }
        return results.flat();
    }

    static async validate(inputItem) {
        const { DataType } = this;
        const result = await DataType.validateInternal(inputItem);
        let prefix = DataType.name;
        prefix = prefix[0].toLowerCase() + prefix.substring(1);
        for (let jj = 0; jj < result.length; jj += 1) {
            result[jj][0] = prefix + result[jj][0];
        }
        return result
            .filter((item) => !item[1])
            .map((item) => `${item[0]} ${item[2]}`);
    }
}

export default ValidationBase;