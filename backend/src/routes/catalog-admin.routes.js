import { Router } from 'express';
import { CatalogAdminController } from '../controllers/catalog-admin.controller.js';
import { requireAdminRole } from '../middleware/auth.js';

export const catalogAdminRoutes = Router();

// Todas las operaciones administrativas requieren rol admin (FR-001)
catalogAdminRoutes.use(requireAdminRole);

// Rutas de Categorías (FR-002)
catalogAdminRoutes.get('/categorias', CatalogAdminController.listCategories);
catalogAdminRoutes.post('/categorias', CatalogAdminController.createCategory);
catalogAdminRoutes.put('/categorias/:id', CatalogAdminController.updateCategory);
catalogAdminRoutes.patch('/categorias/:id/archivar', CatalogAdminController.archiveCategory);

// Rutas de Productos (FR-003, FR-004)
catalogAdminRoutes.get('/productos', CatalogAdminController.listProducts);
catalogAdminRoutes.post('/productos', CatalogAdminController.createProduct);
catalogAdminRoutes.get('/productos/:id', CatalogAdminController.getProductById);
catalogAdminRoutes.put('/productos/:id', CatalogAdminController.updateProduct);
catalogAdminRoutes.delete('/productos/:id', CatalogAdminController.deleteOrArchiveProduct);

// Rutas de Variantes y Stock (FR-005, FR-007)
catalogAdminRoutes.patch('/variantes/:id/stock', CatalogAdminController.updateVariantStock);

// Rutas de Alertas de Stock (FR-006, SC-002)
catalogAdminRoutes.get('/alertas-stock', CatalogAdminController.listStockAlerts);
