
import {
    ContentState, EditorState, convertFromRaw, convertToRaw,
} from 'draft-js';

import assert from './assert';

const StorageType = {
    PLAINTEXT: 'plaintext:',
    DRAFTJS: 'draftjs:',
};

class TextEditorUtils {
    // eslint-disable-next-line consistent-return
    static extractPlainText(value) {
        if (!value) {
            return '';
        } if (value.startsWith(StorageType.PLAINTEXT)) {
            return value.substring(StorageType.PLAINTEXT.length);
        } if (value.startsWith(StorageType.DRAFTJS)) {
            const payload = value.substring(StorageType.DRAFTJS.length);
            const content = JSON.parse(payload);
            // assert(content.blocks.length === 1);
            return content.blocks[0].text;
        }
        assert(false, value);
    }

    static extractLogTags(value) {
        const content = TextEditorUtils.deserialize(value);
        const logTags = {};
        Object.values(content.entityMap)
            .filter((entity) => entity.type === 'mention' || entity.type === '#mention')
            .forEach((entity) => {
                const logTag = entity.data.mention;
                logTags[logTag.id] = logTag;
            });
        return logTags;
    }

    // eslint-disable-next-line consistent-return
    static deserialize(value) {
        if (!value) {
            return convertToRaw(EditorState.createEmpty().getCurrentContent());
        } if (value.startsWith(StorageType.PLAINTEXT)) {
            const payload = value.substring(StorageType.PLAINTEXT.length);
            const editorState = EditorState.createWithContent(ContentState.createFromText(payload));
            return convertToRaw(editorState.getCurrentContent());
        } if (value.startsWith(StorageType.DRAFTJS)) {
            const payload = value.substring(StorageType.DRAFTJS.length);
            return JSON.parse(payload);
        }
        assert(false, value);
    }

    // eslint-disable-next-line consistent-return
    static serialize(value) {
        if (!value) {
            return '';
        } if (typeof value === 'string') {
            return StorageType.PLAINTEXT + value;
        } if (typeof value === 'object') {
            if (value.blocks.length > 1 || value.blocks[0].text.length > 0) {
                return StorageType.DRAFTJS + JSON.stringify(value);
            }
            return '';
        }
        assert(false, value);
    }

    static fromEditorState(editorState) {
        return convertToRaw(editorState.getCurrentContent());
    }

    static toEditorState(value) {
        const editorState = EditorState.createWithContent(convertFromRaw(value));
        return EditorState.moveSelectionToEnd(editorState);
    }

    static fixCursorBug(prevEditorState, nextEditorState) {
        // https://github.com/facebook/draft-js/issues/1198
        const prevSelection = prevEditorState.getSelection();
        const nextSelection = nextEditorState.getSelection();
        if (
            prevSelection.getAnchorKey() === nextSelection.getAnchorKey()
            && prevSelection.getAnchorOffset() === 0
            && nextSelection.getAnchorOffset() === 1
            && prevSelection.getFocusKey() === nextSelection.getFocusKey()
            && prevSelection.getFocusOffset() === 0
            && nextSelection.getFocusOffset() === 1
            && prevSelection.getHasFocus() === false
            && nextSelection.getHasFocus() === false
        ) {
            const fixedSelection = nextSelection.merge({ hasFocus: true });
            return EditorState.forceSelection(nextEditorState, fixedSelection);
        }
        return nextEditorState;
    }
}

export default TextEditorUtils;
