import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app } from '../../backend/src/server.js';

// Feature 009 - Identidad visual unificada de tienda de cerámica

const PAGINAS = [
  { ruta: '/catalogo', activo: 'Catálogo' },
  { ruta: '/carrito', activo: 'Cesta' },
  { ruta: '/checkout', activo: 'Cesta' },
  { ruta: '/cuenta', activo: 'Mi Cuenta' },
  { ruta: '/logistica', activo: 'Envíos' },
  { ruta: '/admin/catalogo', activo: 'Administración', admin: true },
  { ruta: '/admin/ventas', activo: 'Administración', admin: true }
];

const HOJAS = [
  'tema-ceramica.css',
  'catalogo.css',
  'resenas.css',
  'cart.css',
  'checkout.css',
  'cuenta.css',
  'logistica.css',
  'admin-catalogo.css',
  'admin-ventas.css'
];

// Colores del tema oscuro/índigo retirados (data-model.md, SC-004)
const COLORES_RETIRADOS = [
  '#4f46e5', '#4338ca', '#7c3aed', '#6366f1', '#818cf8', '#a5b4fc', '#8b5cf6',
  '#0b0f19', '#111827', '#1f2937', '#1e293b',
  'rgba(30,41,59', 'rgba(17,24,39', 'rgba(15,23,42', 'rgba(99,102,241', 'rgba(79,70,229'
];

let server;
let base;

async function obtener(ruta) {
  const res = await fetch(`${base}${ruta}`);
  assert.equal(res.status, 200, `${ruta} debe responder 200`);
  return res.text();
}

function cabecera(html) {
  const inicio = html.indexOf('<header class="site-header"');
  const fin = html.indexOf('</header>', inicio);
  assert.ok(inicio >= 0 && fin > inicio, 'Debe existir la cabecera común <header class="site-header">');
  return html.slice(inicio, fin);
}

function normalizar(css) {
  return css.toLowerCase().replace(/\s+/g, '');
}

describe('Identidad visual unificada (Feature 009)', () => {
  before(() => {
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => {
    server.close();
  });

  describe('US1 - Cabecera común en las 7 páginas (FR-001 a FR-004)', () => {
    for (const pagina of PAGINAS) {
      it(`${pagina.ruta} enlaza el tema y muestra la cabecera común con "${pagina.activo}" activo`, async () => {
        const html = await obtener(pagina.ruta);
        assert.ok(html.includes('/src/styles/tema-ceramica.css'), 'Debe enlazar tema-ceramica.css');

        const header = cabecera(html);
        for (const href of ['/catalogo', '/carrito', '/logistica', '/cuenta']) {
          assert.ok(header.includes(`href="${href}"`), `La cabecera debe enlazar ${href}`);
        }
        assert.ok(header.includes('id="nav-admin"'), 'La cabecera debe incluir el enlace de administración');

        const activos = header.match(/aria-current="page"/g) || [];
        assert.equal(activos.length, 1, 'Debe haber exactamente un enlace activo');
        const enlaceActivo = header.match(/<a [^>]*aria-current="page"[^>]*>([^<]+)<\/a>/);
        assert.ok(enlaceActivo, 'El enlace activo debe ser un <a>');
        assert.equal(enlaceActivo[1].trim(), pagina.activo);

        if (pagina.admin) {
          assert.ok(html.includes('class="admin-subnav"'), 'Las páginas de administración incluyen la subnavegación');
          assert.ok(!/id="nav-admin"[^>]*hidden/.test(header), 'En administración el enlace es visible');
        } else {
          assert.ok(/id="nav-admin"[^>]*hidden/.test(header), 'En páginas públicas el enlace nace oculto');
        }
      });
    }

    it('el tema se carga antes que la hoja propia de cada página', async () => {
      for (const { ruta } of PAGINAS) {
        const html = await obtener(ruta);
        const hojas = [...html.matchAll(/href="\/src\/styles\/([^"]+)"/g)].map(m => m[1]);
        assert.equal(hojas[0], 'tema-ceramica.css', `${ruta}: la primera hoja debe ser el tema (${hojas.join(', ')})`);
      }
    });

    it('sirve el módulo de cabecera site-header.js', async () => {
      const js = await obtener('/src/components/site-header.js');
      assert.ok(js.includes('nav-admin'));
    });
  });

  describe('US2 - Paleta tierra sin restos del tema oscuro (FR-005, FR-006, SC-004)', () => {
    for (const hoja of HOJAS) {
      it(`${hoja} no contiene colores retirados`, async () => {
        const css = normalizar(await obtener(`/src/styles/${hoja}`));
        const encontrados = COLORES_RETIRADOS.filter(color => css.includes(color));
        assert.deepEqual(encontrados, [], `Colores retirados en ${hoja}`);
      });
    }

    it('las páginas y componentes JS no contienen colores retirados (incluidos estilos en línea y SVG codificados)', () => {
      const raiz = fileURLToPath(new URL('../../frontend/', import.meta.url));
      const archivos = [
        ...fs.readdirSync(path.join(raiz, 'public'), { recursive: true }).filter(f => f.endsWith('.html')).map(f => path.join(raiz, 'public', f)),
        ...fs.readdirSync(path.join(raiz, 'src', 'components'), { recursive: true }).filter(f => f.endsWith('.js')).map(f => path.join(raiz, 'src', 'components', f))
      ];
      // Además de los colores retirados, los grises azulados de texto del tema oscuro
      const colores = [...COLORES_RETIRADOS, '#94a3b8', '#e2e8f0', '#cbd5e1', '#f8fafc'];
      const aparece = (contenido, color) => color.startsWith('#')
        ? new RegExp(`${color}(?![0-9a-f])`).test(contenido)
        : contenido.includes(color);
      const conRestos = [];
      for (const archivo of archivos) {
        const contenido = normalizar(fs.readFileSync(archivo, 'utf8')).replace(/%23/g, '#');
        const encontrados = colores.filter(color => aparece(contenido, color));
        if (encontrados.length) conRestos.push(`${path.relative(raiz, archivo)}: ${encontrados.join(', ')}`);
      }
      assert.deepEqual(conRestos, []);
    });

    it('solo tema-ceramica.css define --accent-primary', async () => {
      for (const hoja of HOJAS) {
        const css = normalizar(await obtener(`/src/styles/${hoja}`));
        const define = css.includes('--accent-primary:');
        assert.equal(define, hoja === 'tema-ceramica.css', `${hoja} ${define ? 'no debe' : 'debe'} definir --accent-primary`);
      }
    });
  });

  describe('US3 - Mismo color por estado de pedido (FR-009)', () => {
    it('logistica.css colorea cada estado con las variables --status-*', async () => {
      const css = normalizar(await obtener('/src/styles/logistica.css'));
      const reglas = {
        '.badge-paid{': 'var(--status-pagado',
        '.badge-prep{': 'var(--status-preparacion',
        '.badge-shipped{': 'var(--status-salido',
        '.badge-delivered{': 'var(--status-entregado'
      };
      for (const [selector, variable] of Object.entries(reglas)) {
        const inicio = css.indexOf(selector);
        assert.ok(inicio >= 0, `Falta la regla ${selector}`);
        const cuerpo = css.slice(inicio, css.indexOf('}', inicio));
        assert.ok(cuerpo.includes(variable), `${selector} debe usar ${variable}`);
      }
    });

    it('Mi Cuenta usa las clases de estado compartidas del tema', async () => {
      const js = await obtener('/src/components/cuenta/order-history.js');
      for (const clase of ['badge-pendiente', 'badge-pagado', 'badge-en_preparacion', 'badge-salido_tienda', 'badge-entregado']) {
        assert.ok(js.includes(clase), `order-history.js debe usar ${clase}`);
      }
      const tema = normalizar(await obtener('/src/styles/tema-ceramica.css'));
      assert.ok(tema.includes('.badge-salido_tienda{color:var(--status-salido)'));
    });
  });
});
