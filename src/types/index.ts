export type UserRole =
  | 'ADMIN'
  | 'MIS'
  | 'MANAGER'
  | 'IT_PROCUREMENT'
  | 'SPV_PLAZABALI_T3'
  | 'SPV_PLAZABALI_T2'
  | 'SPV_SAM_T3'
  | 'SPV_SAM_T2'
  | 'SPV_PLAZABALI'
  | 'SPV_SAM';

export interface RolePermission {
  id?: number;
  role: UserRole;
  menu_key: string;
  can_view: boolean | number;
  can_edit: boolean | number;
  updated_at?: string;
}

export interface User {
  id?: number;
  username: string;
  name: string;
  role: UserRole;
  shop_location: string;
  password?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Asset {
  id?: number;
  asset_code: string;
  name: string;
  category: 'POS Terminal' | 'Printer Thermal' | 'Barcode Scanner' | 'Network / Router' | 'UPS / Kelistrikan' | 'EDC / Payment' | 'Display / Monitor' | 'Lainnya';
  shop_location: string;
  brand_model: string;
  serial_number: string;
  ip_address?: string | null;
  purchase_date?: string | null;
  status: 'OPERASIONAL' | 'RUSAK' | 'PERBAIKAN' | 'CADANGAN';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type NetworkDeviceType = 'ROUTER' | 'SWITCH' | 'ACCESS_POINT' | 'MODEM' | 'FIREWALL' | 'OTHER';

export interface NetworkAsset {
  id?: number;
  asset_code: string;
  name: string;
  device_type: NetworkDeviceType;
  brand_model: string;
  serial_number: string;
  mac_address?: string;
  ip_address?: string;
  subnet_mask?: string;
  gateway?: string;
  vlan?: string;
  port_count?: string;
  location: string;
  counter_zone?: string;
  firmware_version?: string;
  status: 'OPERASIONAL' | 'CADANGAN' | 'PERBAIKAN' | 'RUSAK';
  purchase_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Ticket {
  id?: number;
  ticket_number: string;
  asset_code: string;
  shop_location: string;
  reporter_name: string;
  urgency: 'RENDAH' | 'SEDANG' | 'TINGGI' | 'DARURAT';
  status: 'MENUNGGU' | 'DIPROSES' | 'SELESAI' | 'DIBATALKAN';
  problem_title: string;
  problem_desc: string;
  it_notes?: string | null;
  created_at?: string;
  resolved_at?: string | null;
}

export interface MonitoringItem {
  id?: number;
  asset_code: string;
  name?: string;
  asset_name?: string;
  category?: string;
  shop_location?: string;
  ip_address: string;
  status: 'ONLINE' | 'OFFLINE' | 'WARNING';
  response_time_ms?: number;
  last_heartbeat?: string;
  details?: string;
}

export interface DvrAsset {
  id?: number;
  asset_code: string;
  location: string;
  dvr_type: string;
  serial_number: string;
  harddisk: string;
  channels: string;
  camera_count: string;
  retention_days: string;
  username: string;
  password?: string;
  ip_address: string;
  http_port?: number;
  rtsp_port?: number;
  server_port?: number;
  protocol?: string;
  channel_names?: string;
  rtsp_stream_url?: string;
  status: 'OPERASIONAL' | 'RUSAK' | 'PERBAIKAN' | 'OFFLINE';
  notes?: string;
  anydesk_id?: string;
  anydesk_password?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PosHardwareAsset {
  id?: number;
  pos_number: number;
  counter_no: number;
  pos_code: string;
  shop_name: string;
  terminal: string;
  counter_zone: string;
  store_alias?: string;
  ip_address: string;
  pos_brand: string;
  pos_sn?: string;
  processor?: string;
  ram?: string;
  ssd?: string;
  tsigunta_version?: string;
  passport_scanner?: string;
  barcode_scanner?: string;
  printer?: string;
  fingerprint_scanner?: string;
  keyboard?: string;
  mouse?: string;
  cash_drawer?: string;
  monitor?: string;
  os_version?: string;
  ups?: string;
  status: 'OPERASIONAL' | 'RUSAK' | 'PERBAIKAN' | 'CADANGAN';
  notes?: string;
  anydesk_id?: string;
  anydesk_password?: string;
  created_at?: string;
  updated_at?: string;
  // Attached EDC details from edc_assets
  bca_tid?: string;
  bni_tid?: string;
  mandiri_tid?: string;
  bri_tid?: string;
}

export interface EdcAsset {
  id?: number;
  pos_location: string;
  shop_name: string;
  is_active: 'Y' | 'N';
  // BCA
  bca_credit?: string;
  bca_debit?: string;
  bca_qr?: string;
  bca_tid?: string;
  bca_mid?: string;
  // BNI
  bni_credit?: string;
  bni_debit?: string;
  bni_qr?: string;
  bni_tid?: string;
  bni_mid?: string;
  // MANDIRI
  mandiri_credit?: string;
  mandiri_debit?: string;
  mandiri_qr?: string;
  mandiri_tid?: string;
  mandiri_mid?: string;
  // BRI
  bri_credit?: string;
  bri_debit?: string;
  bri_qr?: string;
  bri_tid?: string;
  bri_mid?: string;
  notes?: string;
  anydesk_id?: string;
  anydesk_password?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AssetTransfer {
  id?: number;
  transfer_code: string;
  transfer_type: 'REPLACE_AND_TRANSFER' | 'DIRECT_TRANSFER' | 'NEW_INSTALL' | 'RETURN_TO_SPARE';
  component_type: string;
  item_name: string;

  // Source / Asal
  source_type: string;
  source_asset_code?: string;
  source_location: string;
  source_shop?: string;
  source_item_model?: string;
  source_item_sn?: string;

  // Destination / Tujuan
  dest_type: string;
  dest_asset_code?: string;
  dest_location: string;
  dest_shop?: string;

  // Unit Baru dari Pengadaan / MIS PROC (untuk REPLACE_AND_TRANSFER atau NEW_INSTALL)
  new_item_model?: string;
  new_item_sn?: string;
  new_item_source?: string;

  // Pelaksana & Waktu
  performed_by: string;
  transfer_date?: string;
  reason: string;
  reference_no?: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OfficeHardwareAsset {
  id?: number;
  asset_code: string;
  item_no?: number;
  office_location?: string;
  division: string;
  user_name: string;
  os?: string;
  motherboard?: string;
  processor?: string;
  ram?: string;
  monitor?: string;
  hard_drive?: string;
  used_disk1?: string;
  used_disk2?: string;
  keyboard?: string;
  mouse?: string;
  printer?: string;
  ups?: string;
  ip_address?: string;
  device_type?: 'PC' | 'PRINTER' | 'ROUTER' | 'PABX' | 'FACILITY' | 'UPS' | string;
  status: 'OPERASIONAL' | 'RUSAK' | 'PERBAIKAN' | 'CADANGAN';
  notes?: string;
  anydesk_id?: string;
  anydesk_password?: string;
  created_at?: string;
  updated_at?: string;
}

export type PurchaseStatus =
  | 'PENGAJUAN'              // Diajukan MIS OPS ke Manager
  | 'DISETUJUI_MANAGER'      // Disetujui Manager -> Teruskan ke MIS Procurement untuk CAPEX
  | 'DITOLAK_MANAGER'        // Ditolak / Revisi Manager
  | 'PROSES_ORDER'           // MIS Proc telah buat CAPEX, input detail toko & sedang order
  | 'SUDAH_DATANG'           // Barang fisik telah tiba di kantor / procurement
  | 'SIAP_KIRIM_T3'          // Barang siap dikirim ke Terminal 3 / Toko
  | 'DITERIMA_T3'            // Barang telah diterima di T3 oleh MIS OPS
  | 'DISETUJUI'              // Backward compatibility
  | 'PROSES_BELI'            // Backward compatibility
  | 'DITERIMA'               // Backward compatibility
  | 'DIBATALKAN';

export interface PurchaseItem {
  id?: number;
  po_number: string;
  item_name: string;
  category: 'Hardware POS' | 'Office PC' | 'CCTV & DVR' | 'Network' | 'Consumable & Ribbon' | 'Periferal & Sparepart';
  target_location: string;
  quantity: number;
  unit: string;
  estimated_price: number;
  total_price: number;
  vendor?: string;
  request_date?: string;
  purchase_date?: string;
  received_date?: string;
  requester: string;
  status: PurchaseStatus;
  priority: 'BIASA' | 'URGENT' | 'CRITICAL';
  notes?: string;
  component_type?: string;
  serial_number?: string;
  target_pos_code?: string;
  installed_pos_code?: string;
  installed_at?: string;
  installed_by?: string;
  created_at?: string;
  updated_at?: string;

  // Workflow Pengadaan Lengkap (MIS OPS -> Manager -> MIS Procurement -> T3)
  capex_number?: string;
  brand_model?: string;
  item_price?: number;
  store_type?: 'ONLINE_SHOP' | 'TOKO_OFFLINE';
  store_name?: string;
  store_link?: string;
  invoice_url?: string;
  arrival_date?: string;
  shipped_to_t3_date?: string;
  shipping_courier?: string;
  received_by_t3_at?: string;
  manager_approved_at?: string;
  manager_approved_by?: string;
  manager_notes?: string;
}

export interface T3FixedAsset {
  id?: number;
  item_no?: number;
  tgl_perolehan: string;
  tgl_pemakaian: string;
  kategori: string;
  nama_merk: string;
  serial_number: string;
  spesifikasi: string;
  lokasi: string; // DF1, DF2, DF3, DF4, DF5, DF6, DF7
  pengguna: string;
  harga_pembelian: number;
  qty: number;
  no_asset: string;
  keterangan?: string;
  status?: 'OPERASIONAL' | 'RUSAK' | 'PERBAIKAN' | 'CADANGAN';
  created_at?: string;
  updated_at?: string;
}

export interface PhoneExtension {
  id?: number;
  item_no?: number;
  division: string;
  user_name: string;
  ext: string;
  ext_display?: string;
  location?: string;
  notes?: string;
  ip_address?: string;
  status?: 'AKTIF' | 'KOSONG' | 'STANDBY';
  created_at?: string;
  updated_at?: string;
}

export interface ServerRackPort {
  id?: number;
  rack_type?: 'RACK_32U_MAIN' | 'RACK_6U_WALLMOUNT';
  device_group: 'SWITCH_1_VOIP' | 'SWITCH_2_PC' | 'SWITCH_3_CORE' | 'PATCH_PANEL_3' | 'WALLMOUNT_SW1_VOIP' | 'WALLMOUNT_SW1_PC' | 'ROUTER_RUIJIE' | 'MIKROTIK_140' | 'MIKROTIK_196' | 'MODEM_HYPERNET' | 'MODEM_STARLINK' | 'YEASTAR_PABX' | 'DINSTAR_GSM';
  port_no: number;
  port_label: string;
  patch_panel_label?: string;
  device_type: 'VOIP' | 'PC' | 'AP_POE' | 'BACKBONE' | 'UPLINK' | 'ROUTER' | 'MODEM' | 'PABX' | 'GATEWAY' | 'STANDBY';
  user_name?: string;
  ext?: string;
  ip_address?: string;
  destination?: string;
  cable_color?: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'UPLINK' | 'STANDBY';
  notes?: string;
  anydesk_id?: string;
  anydesk_password?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ServerRackUnit {
  id?: number;
  rack_type?: 'RACK_32U_MAIN' | 'RACK_6U_WALLMOUNT';
  u_position: number; // 1 to 32 or 1 to 6
  name: string;
  device_type: string;
  description: string;
  height_u: number;
  vendor?: string;
  ip_address?: string;
  status: 'OPERASIONAL' | 'WARNING' | 'STANDBY';
}

export interface KnowledgeBaseArticle {
  id?: number;
  title: string;
  slug?: string;
  category: 'Mesin EDC' | 'Hardware POS' | 'Printer Kasir' | 'Scanner & Periferal' | 'Jaringan & CCTV' | 'Aplikasi Tsigunta' | 'SOP Operasional' | string;
  target_role: string;
  store_scope: string;
  summary: string;
  content: string;
  steps?: string;
  author_name: string;
  author_role: string;
  tags?: string;
  is_pinned: number;
  is_published: number;
  view_count: number;
  helpful_count: number;
  created_at?: string;
  updated_at?: string;
}

