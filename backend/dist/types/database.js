"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageStatus = exports.MessageType = void 0;
// Tipos de base de datos - Reemplazo de Prisma
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "TEXT";
    MessageType["IMAGE"] = "IMAGE";
    MessageType["DOCUMENT"] = "DOCUMENT";
    MessageType["AUDIO"] = "AUDIO";
    MessageType["VIDEO"] = "VIDEO";
    MessageType["STICKER"] = "STICKER";
    MessageType["LOCATION"] = "LOCATION";
    MessageType["CONTACT"] = "CONTACT";
})(MessageType || (exports.MessageType = MessageType = {}));
var MessageStatus;
(function (MessageStatus) {
    MessageStatus["SENDING"] = "SENDING";
    MessageStatus["SENT"] = "SENT";
    MessageStatus["DELIVERED"] = "DELIVERED";
    MessageStatus["READ"] = "READ";
    MessageStatus["FAILED"] = "FAILED";
})(MessageStatus || (exports.MessageStatus = MessageStatus = {}));
