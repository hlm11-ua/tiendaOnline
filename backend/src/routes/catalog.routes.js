import { Router } from 'express';
import { CatalogController } from '../controllers/catalog.controller.js';

export const catalogRoutes = Router();

// Endpoints públicos del catálogo
catalogRoutes.get('/filtros', CatalogController.obtenerFiltros);
catalogRoutes.get('/productos', CatalogController.listarProductos);
catalogRoutes.get('/productos/:id', CatalogController.obtenerProducto);
