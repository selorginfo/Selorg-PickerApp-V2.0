# 10 — Product / Category / Search APIs

All under `/api/v1/customer` unless noted. Mostly **public** (no auth).

---

## Products

| API | Method | Path | Query / notes |
|-----|--------|------|---------------|
| List | GET | `/products` | `page`, `limit`, `categoryId`, `search`, `sort`, `storeId` |
| Detail | GET | `/products/{id}` | PDP — variants, pricing, stock fields |
| By category | GET | `/products/category/{categoryId}` | list params |
| Search | GET | `/products/search` | `q` + list params |
| Suggestions | GET | `/products/search/suggestions` | `q` |

Backend also mounts `/search`, `/suggestions`, `/trending` aliases — prefer the paths the Customer app already calls.

### Pricing fields (as used conceptually)

| Field | Meaning |
|-------|---------|
| `price` / sale | Selling price |
| `mrp` | MRP |
| Stock | `stockQuantity` / availability flags from API payload |

Do not invent field names in UI binding — bind to whatever detail/list response returns (see examples).

---

## Categories / subcategories

| API | Method | Path |
|-----|--------|------|
| List | GET | `/categories` |
| Detail | GET | `/categories/{id}` | optional `subCategoryId` — returns category, subcategories, banners, products |
| Products by slug | GET | `/categories/{slug}/products` | `subcategory`, `sort`, `page`, `limit` |

---

## Collections / sections / pages / banners / home

| API | Path | Screen |
|-----|------|--------|
| Bootstrap | GET `/bootstrap` | App start — `pages.home.blocks`, flags, appConfig |
| Home | GET `/home` | Categories / typeByKey |
| Page | GET `/pages/{slug}` | DynamicPage |
| Collection | GET `/collections/{slugOrId}` | CollectionProducts |
| Banner | GET `/banners/{id}` | BannerDetail |
| Section products | GET `/sections/{key}/products` | Backend available; confirm UI usage |
| App config | GET `/app-config` | Fees, tips, support, payment config |

---

## Availability

- Driven by store assignment + product/inventory payloads
- `POST /store/assign` with lat/lng
- Inventory endpoint unused by UI

---

## Admin catalog (not customer browse)

Admin/CMS uses `/customer/admin/home/products*`, categories, attributes, banners, CMS uploads — see `13-admin-dashboard-api.md`.

---

## Example request

```http
GET /api/v1/customer/products/search?q=milk&page=1&limit=20
```

```http
GET /api/v1/customer/products/<PRODUCT_ID>
```

Sanitized responses: `16-api-response-examples.md`.
