# backend/app/odoo_sync.py
import xmlrpc.client
import os
from dotenv import load_dotenv

load_dotenv()

def push_session_to_odoo(session_id: int, total_sales: float, order_count: int):
    if os.getenv("ODOO_ENABLED", "false").lower() != "true":
        return {"skipped": True}
    
    url = os.getenv("ODOO_URL")
    db = os.getenv("ODOO_DB")
    username = os.getenv("ODOO_USER")
    password = os.getenv("ODOO_PASSWORD")

    try:
        common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common", allow_none=True)
        uid = common.authenticate(db, username, password, {})
        if not uid:
            return {"error": "Odoo auth failed"}

        models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object", allow_none=True)
        
        # Push as a note on res.partner (safest — works regardless of which apps are installed)
        partner_id = models.execute_kw(db, uid, password, 'res.partner', 'search',
            [[['name', '=', 'Velvet & Vapor Cafe']]])
        
        if not partner_id:
            partner_id = [models.execute_kw(db, uid, password, 'res.partner', 'create', [{
                'name': 'Velvet & Vapor Cafe',
                'comment': 'Auto-created by POS system'
            }])]

        # Log session summary as internal note
        models.execute_kw(db, uid, password, 'mail.message', 'create', [{
            'body': f'<p><b>POS Session #{session_id} Closed</b><br/>'
                    f'Total Sales: ₹{total_sales}<br/>'
                    f'Orders Completed: {order_count}</p>',
            'model': 'res.partner',
            'res_id': partner_id[0],
            'message_type': 'comment',
            'subtype_id': 1,
        }])
        
        return {"success": True, "session_id": session_id}
    except Exception as e:
        return {"error": str(e)}