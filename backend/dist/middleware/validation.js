"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const express_validator_1 = require("express-validator");
const logger_1 = require("../utils/logger");
/**
 * Middleware para ejecutar validaciones y manejar errores
 */
const validateRequest = (validations) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        // Ejecutar todas las validaciones
        yield Promise.all(validations.map(validation => validation.run(req)));
        const errors = (0, express_validator_1.validationResult)(req);
        if (errors.isEmpty()) {
            return next();
        }
        // Log de errores de validación
        logger_1.logger.warn('Validation errors', {
            path: req.path,
            method: req.method,
            // Map a campo+mensaje para evitar tipos estrictos
            errors: errors.array()
        });
        // Formatear errores para respuesta
        const formattedErrors = errors.array().reduce((acc, error) => {
            const field = error.path || error.param;
            if (!acc[field]) {
                acc[field] = [];
            }
            acc[field].push(error.msg);
            return acc;
        }, {});
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            code: 'VALIDATION_ERROR',
            errors: formattedErrors
        });
    });
};
exports.validateRequest = validateRequest;
