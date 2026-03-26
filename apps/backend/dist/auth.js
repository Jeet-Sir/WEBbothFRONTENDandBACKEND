"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueJwt = issueJwt;
exports.verifyJwt = verifyJwt;
const node_crypto_1 = __importDefault(require("node:crypto"));
const config_1 = require("./config");
function b64url(input) {
    return Buffer.from(input, 'utf8').toString('base64url');
}
function b64urlDecode(input) {
    return Buffer.from(input, 'base64url').toString('utf8');
}
function issueJwt(payload, expiresInSeconds = 7 * 24 * 60 * 60) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const body = {
        ...payload,
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    };
    const encodedHeader = b64url(JSON.stringify(header));
    const encodedBody = b64url(JSON.stringify(body));
    const signature = node_crypto_1.default
        .createHmac('sha256', config_1.config.jwtSecret)
        .update(`${encodedHeader}.${encodedBody}`)
        .digest('base64url');
    return `${encodedHeader}.${encodedBody}.${signature}`;
}
function verifyJwt(token) {
    const parts = token.split('.');
    if (parts.length !== 3)
        return null;
    const [encodedHeader, encodedBody, signature] = parts;
    const expected = node_crypto_1.default
        .createHmac('sha256', config_1.config.jwtSecret)
        .update(`${encodedHeader}.${encodedBody}`)
        .digest('base64url');
    if (signature !== expected)
        return null;
    const payload = JSON.parse(b64urlDecode(encodedBody));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
        return null;
    return { userId: payload.userId, email: payload.email, scope: payload.scope };
}
