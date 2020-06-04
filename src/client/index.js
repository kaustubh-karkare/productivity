import React from 'react';
import ReactDOM from 'react-dom';
import io from 'socket.io-client';
import SocketRPC from '../common/socket_rpc';
import Application from './Application.react';

import './bootstrap.css';
import './index.css';

function initCookies() {
    document.cookies = document.cookie.split('; ').reduce((result, item) => {
        const [key, value] = item.split('=');
        // eslint-disable-next-line no-param-reassign
        result[key] = value;
        return result;
    }, {});
}

function getNegativeID() {
    if (typeof window.negativeID === 'undefined') {
        window.negativeID = 0;
    }
    window.negativeID -= 1;
    return window.negativeID;
}

window.main = function main() {
    initCookies();
    window.api = new SocketRPC(io(`localhost:${document.cookies.port}`));
    window.getNegativeID = getNegativeID;

    ReactDOM.render(
        <Application />,
        document.getElementById('root'),
    );
};
