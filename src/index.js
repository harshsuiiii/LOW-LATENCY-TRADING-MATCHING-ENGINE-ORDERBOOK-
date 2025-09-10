"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TICKER = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
exports.app = (0, express_1.default)();
exports.app.use(body_parser_1.default.json({}));
;
exports.TICKER = "GOOGLE";
const users = [{
        Id: "1",
        balances: {
            "GOOGLE": 10,
            "USD": 5000
        },
    }, {
        Id: "2",
        balances: {
            "GOOGLE": 10,
            "USD": 50000
        },
    }];
const bids = [];
const asks = [];
//# sourceMappingURL=index.js.map