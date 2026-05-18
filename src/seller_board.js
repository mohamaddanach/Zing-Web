import { initializeApp } from 'firebase/app';
import { 
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    doc,
    updateDoc,
    setDoc,
    deleteDoc,
    getDoc,
    increment,
    getDocs 
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBuh5e6OsM92P7c11XKOKxhZxsLEc0Q8PE",
    authDomain: "zingdb-9653d.firebaseapp.com",
    projectId: "zingdb-9653d",
    storageBucket: "zingdb-9653d.appspot.com", 
    messagingSenderId: "72448395530",
    appId: "1:72448395530:web:dadc8947a300cbea6c12f3",
    measurementId: "G-5D61PS4HN6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let sellerData = null; 
const stored_data = sessionStorage.getItem('currentSeller');
if (stored_data) {
    sellerData = JSON.parse(stored_data);
    document.getElementById('seller_name').innerText = sellerData.name || "Unknown";
    document.getElementById('display_id').innerText = sellerData.seller_id || "N/A";
    document.getElementById('display_category').innerText = sellerData.product_category || "N/A";
    
    if (sellerData.profile_image) {
        const img = document.getElementById('display_img');
        img.src = sellerData.profile_image;
        img.style.display = 'block';
    }
} else {
    window.location.href = 'seller_login.html';
}

document.getElementById('logout_btn').onclick = () => {
    sessionStorage.removeItem('currentSeller');
    window.location.href = 'seller_login.html';
};

const coll_name = 'products_' + sellerData.product_category;
const product_in_inventory = collection(db, coll_name);
const mycontainerquery = query(product_in_inventory, where("seller_id", "==", sellerData.seller_id));
const add_prd_btn = document.getElementById('add_to_inventory');
// --- HELPER: MOVE TO OUT OF STOCK ---
const moveOutOfStock = async (id, data, originalCollection) => {
    const outOfStockColl = collection(db, 'out_of_the_stock');
    const originalDocRef = doc(db, originalCollection, id);

    try {
        // Create in out_of_the_stock
        await setDoc(doc(outOfStockColl, id), {
            ...data,
            moved_at: new Date(),
            original_collection: originalCollection,
            status: false // Deactivate since it's out of stock
        });

        // Delete from original category collection
        await deleteDoc(originalDocRef);
        console.log(`Product ${id} moved to Out of Stock successfully.`);
    } catch (error) {
        console.error("Error during move operation:", error);
    }
};

if (add_prd_btn) {
    add_prd_btn.addEventListener('click', async (e) => {
        e.preventDefault();

        if (!sellerData) {
            alert("Error: No seller data found. Please log in again.");
            return;
        }

        const fileInput = document.getElementById('image');
        const files = fileInput ? fileInput.files : [];

        if (files.length === 0) {
            alert("Please upload at least one image");
            return;
        }

        const read_the_file = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });
        };

        try {
            const imagePromises = Array.from(files).map(file => read_the_file(file));
            const build_array = await Promise.all(imagePromises);
            const priceInput = document.getElementById('price').value;
            const seller_price = parseFloat(priceInput);
            
            if (isNaN(seller_price)) {
                alert("Please enter a valid numeric price");
                return;
            }

            const priceonplatform = Number((seller_price * 1.08).toFixed(2));
            const added_value = Number(priceonplatform - seller_price);
            const profit_one_item = Number(added_value / 2);
            const bonus_reserve = Number(added_value / 2);

            await addDoc(product_in_inventory, {
                seller_id: sellerData.seller_id,
                seller_name: sellerData.name, 
                product_name: document.getElementById('product_name').value,
                sub_title: document.getElementById('sub_title').value,
                description: document.getElementById('description').value,
                quantity: Number(document.getElementById('qty').value),
                current_quantity : Number(document.getElementById('qty').value),
                price: seller_price,
                priceonplatform: priceonplatform, 
                added_value: added_value,
                profit_one_item: profit_one_item,
                bonus_reserve: bonus_reserve,
                images: build_array,
                status: false,
                date: new Date()
            });

            alert("The product is added successfully");
            document.querySelector('.add_product').reset();              
        } catch (error) {
            console.error("Error saving to Firestore:", error);
            alert("Failed to add. Document might be too large (max 1MB).");
        }
    });
}

// --- INVENTORY LISTENER ---
onSnapshot(mycontainerquery, (snapshot) => {
    const container = document.getElementById('inventory_container');
    let finalhtml = '';

    snapshot.docs.forEach(documentSnapshot => {
        const data = documentSnapshot.data();
        const docId = documentSnapshot.id;

        // ✅ AUTO-MOVE CHECK: If Qty is 0, trigger move and skip rendering
        if (data.current_quantity <= 0) {
            moveOutOfStock(docId, data, coll_name);
            return; 
        }

        const imageSrc = (data.images && data.images.length > 0) ? data.images[0] : 'https://via.placeholder.com/50';
        const statusText = data.status ? "In Showroom" : "Out of Showroom";
        const btnClass = data.status ? "btn-on" : "btn-off";

        finalhtml += `
        <div style="border: 1px solid #ccc; margin: 10px; padding: 10px; display: flex; align-items: center; gap: 15px;">
            <img src="${imageSrc}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;">
            <div style="flex-grow: 1;">
                <strong>${data.product_name}</strong> <small>(${data.sub_title})</small>
                <p style="margin: 5px 0;">Your Price: $${data.price} | Platform: $${data.priceonplatform}</p>
                <p style="margin: 5px 0;">
    Total Qty: ${data.quantity}
</p>

<p style="margin: 5px 0;">
    Current Stock: ${data.current_quantity}
</p>
            </div>
            <div>
                <button type="button" class="${btnClass}" onclick="toggleStatus('${docId}', ${data.status})">
                    ${statusText}
                </button>
            </div>
        </div>
        `;
    });

    if (container) {
        container.innerHTML = finalhtml;
    }
});

window.toggleStatus = async (id, currentStatus) => {
    const docRef = doc(db, coll_name, id);
    try {
        await updateDoc(docRef, {
            status: !currentStatus 
        });
    } catch (error) {
        console.error("Error updating status:", error);
    }
};

const showroomquery = query(
    product_in_inventory, 
    where("seller_id", "==", sellerData.seller_id), 
    where("status", "==", true)
);

// --- SHOWROOM LISTENER ---
onSnapshot(showroomquery, (snapshot) => {
    const container = document.getElementById('showroom');
    let finalhtml = '';

    snapshot.docs.forEach(documentSnapshot => {
        const data = documentSnapshot.data();
        const docId = documentSnapshot.id;

        // Note: No need to check qty here because onSnapshot on inventory handles deletion
        const imageSrc = (data.images && data.images.length > 0) ? data.images[0] : 'https://via.placeholder.com/50';
        const statusText = data.status ? "In Showroom" : "Out of Showroom";
        const btnClass = data.status ? "btn-on" : "btn-off";

        finalhtml += `
        <div style="border: 1px solid #ccc; margin: 10px; padding: 10px; display: flex; align-items: center; gap: 15px;">
            <img src="${imageSrc}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;">
            <div style="flex-grow: 1;">
                <strong>${data.product_name}</strong> <small>(${data.sub_title})</small>
                <p style="margin: 5px 0;">Your Price: $${data.price} | Platform: $${data.priceonplatform}</p>
                <p style="margin: 5px 0;">Qty: ${data.quantity}</p>
            </div>
            <div>
                <button type="button" class="${btnClass}" onclick="toggleStatus('${docId}', ${data.status})">
                    ${statusText}
                </button>
            </div>
        </div>
        `;
    });

    if (container) {
        container.innerHTML = finalhtml;
    }
});

// --- OUT OF STOCK LISTENER ---
const outOfStockColl = collection(db, 'out_of_the_stock');
// We only show out of stock items belonging to THIS seller
const outOfStockQuery = query(outOfStockColl, where("seller_id", "==", sellerData.seller_id));

onSnapshot(outOfStockQuery, (snapshot) => {
    const container = document.getElementById('out_of_stock_container');
    let finalhtml = '';

    snapshot.docs.forEach(documentSnapshot => {
        const data = documentSnapshot.data();
        const docId = documentSnapshot.id;
        const imageSrc = (data.images && data.images.length > 0) ? data.images[0] : 'https://via.placeholder.com/50';

        finalhtml += `
        <div class="product" style="border: 1px solid #ccc; padding: 15px; border-radius: 10px;">
            <img src="${imageSrc}" style="width:100%; height:120px; object-fit:cover; border-radius:8px;">
            <div style="margin-top:10px;">
                <strong>${data.product_name}</strong>
                <p style="font-size:12px; color:red;">Status: Out of Stock</p>
                
                <!-- Update Area -->
                <div id="restock_area_${docId}">
                    <button class="btn-blue" style="width:100%" onclick="showRestockInput('${docId}')">
                        Update Quantity
                    </button>
                </div>
            </div>
        </div>
        `;
    });

    if (container) {
        container.innerHTML = finalhtml || "<p>No out of stock products.</p>";
    }
});

// --- UI FUNCTION: SHOW INPUT ---
window.showRestockInput = (docId) => {
    const area = document.getElementById(`restock_area_${docId}`);
    area.innerHTML = `
        <input type="number" id="new_qty_${docId}" placeholder="Enter Qty" style="margin-bottom:5px;">
        <button class="btn-blue" style="width:100%; margin-bottom:5px;" onclick="processRestock('${docId}')">
            Restock Item
        </button>
        <button class="btn-red" style="width:100%; background:#999;" onclick="location.reload()">
            Cancel
        </button>
    `;
};

// --- LOGIC: MOVE FROM OUT_OF_STOCK BACK TO CATEGORY ---
window.processRestock = async (docId) => {
    const newQty = parseInt(document.getElementById(`new_qty_${docId}`).value);
    
    if (isNaN(newQty) || newQty <= 0) {
        alert("Please enter a valid quantity greater than 0");
        return;
    }

    try {
        // 1. Get the current data from out_of_the_stock
        const outOfStockDocRef = doc(db, 'out_of_the_stock', docId);
        const snapshot = await getDoc(outOfStockDocRef); // Ensure getDoc is imported
        
        if (snapshot.exists()) {
            const productData = snapshot.data();
            const targetCollection = productData.original_collection; // We saved this earlier!

            // 2. Prepare the data for the move back
            const updatedData = {
    ...productData,
    quantity: newQty,
    current_quantity: newQty,   // 🔥 FIX: reset current stock too
    status: false
};
            // Clean up internal move fields
            delete updatedData.moved_at;
            delete updatedData.original_collection;

            // 3. Write to original category collection
            await setDoc(doc(db, targetCollection, docId), updatedData);

            // 4. Delete from out_of_the_stock
            await deleteDoc(outOfStockDocRef);

            alert("Product restocked and moved back to Inventory!");
        }
    } catch (error) {
        console.error("Restock error:", error);
        alert("Failed to restock product.");
    }
};
/// all pending transactions 
// ================================
// DASHBOARD PENDING ORDERS
// ================================

// transactions collection
const transactionsColl = collection(db, "transactions");

// finance collection
const financeColl = collection(db, "transaction_finance");

// get only THIS seller pending orders
const pendingOrdersQuery = query(
    transactionsColl,
    where("seller_name", "==", sellerData.name),
    where("status", "==", "pending")
);

// listen realtime
onSnapshot(pendingOrdersQuery, async (snapshot) => {

    const tableBody = document.getElementById("orders_table_body");

    if (!tableBody) return;

    if (snapshot.empty) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="padding:20px; text-align:center;">
                    No pending orders.
                </td>
            </tr>
        `;
        return;
    }

    let finalHTML = '';

    // loop transactions
    for (const documentSnapshot of snapshot.docs) {

        const transactionData = documentSnapshot.data();

        const transactionId = transactionData.transaction_id;

        let sellerIncome = 0;

        try {

            // find matching finance document
            const financeQuery = query(
                financeColl,
                where("transaction_id", "==", transactionId)
            );

            const financeSnapshot = await new Promise((resolve) => {
                onSnapshot(financeQuery, (snap) => {
                    resolve(snap);
                });
            });

            if (!financeSnapshot.empty) {
                sellerIncome = financeSnapshot.docs[0].data().seller_income || 0;
            }

        } catch (error) {
            console.error("Finance fetch error:", error);
        }

        // format date
        let orderDate = "N/A";

        if (transactionData.timestamp) {
            orderDate = transactionData.timestamp
                .toDate()
                .toLocaleString();
        }

        finalHTML += `
            <tr>
                <td style="padding:10px; border:1px solid #ddd;">
                    ${transactionData.transaction_id}
                </td>

                <td style="padding:10px; border:1px solid #ddd;">
                    ${transactionData.username || 'N/A'}
                </td>

                <td style="padding:10px; border:1px solid #ddd;">
                    ${transactionData.phone_number || 'N/A'}
                </td>

                <td style="padding:10px; border:1px solid #ddd;">
                    ${transactionData.product_name || 'N/A'}
                </td>

                <td style="padding:10px; border:1px solid #ddd;">
                    ${transactionData.quantity || 0}
                </td>

                <td style="padding:10px; border:1px solid #ddd; color:green; font-weight:bold;">
                    $${sellerIncome}
                </td>
                <td style="padding:10px; border:1px solid #ddd;">

    <button
        onclick="markTransactionDone('${documentSnapshot.id}')"
        style="
            background:orange;
            color:white;
            border:none;
            padding:6px 10px;
            border-radius:5px;
            cursor:pointer;
            font-size:12px;
        "
    >
        Pending
    </button>

</td>

                <td style="padding:10px; border:1px solid #ddd;">
                    ${orderDate}
                </td>
            </tr>
        `;
    }

    tableBody.innerHTML = finalHTML;
});
// ================================
// MARK TRANSACTION AS DONE
// ================================
window.markTransactionDone = async (docId) => {

    const confirmAction = confirm(
        "Mark this transaction as DONE?"
    );

    if (!confirmAction) return;

    try {

        // =========================
        // GET TRANSACTION
        // =========================
        const transactionRef = doc(db, "transactions", docId);

        const transactionSnap = await getDoc(transactionRef);

        if (!transactionSnap.exists()) {
            alert("Transaction not found");
            return;
        }

        const transactionData = transactionSnap.data();

        // =========================
        // GET FINANCE DATA
        // =========================
        const financeQuery = query(
            collection(db, "transaction_finance"),
            where("transaction_id", "==", transactionData.transaction_id)
        );

        const financeSnapshot = await new Promise((resolve) => {
            onSnapshot(financeQuery, (snap) => {
                resolve(snap);
            });
        });

        let financeData = null;

        if (!financeSnapshot.empty) {
            financeData = financeSnapshot.docs[0].data();
        }

        // =========================
        // VALUES
        // =========================
        const sellerIncome = financeData?.seller_income || 0;
        const profit = financeData?.profit || 0;
        const bonus = financeData?.bonus_reserve || 0;

        // =========================
        // UPDATE TRANSACTION STATUS
        // =========================
        await updateDoc(transactionRef, {
            status: "done"
        });

        // =========================
        // ADD TO SALES COLLECTION
        // =========================
        await setDoc(
    doc(db, "sales", String(transactionData.transaction_id)),
    {

        transaction_id: transactionData.transaction_id,

        product_name: transactionData.product_name,

        seller_name: transactionData.seller_name,

        quantity_sold: transactionData.quantity,

        client_name: transactionData.username,

        phone_number: transactionData.phone_number,

        country: transactionData.country,

        category: sellerData.product_category,

        total_income_for_seller: sellerIncome,

        profit_for_platform: profit,

        bonus_for_client: bonus,

        timestamp: new Date()
    }
);

        // =========================
        // UPDATE TOTALS
        // =========================
        const totalsRef = doc(db, "totals", "global_totals");

        await setDoc(
            totalsRef,
            {
                total_sales: increment(sellerIncome),

                total_profit: increment(profit),

                total_bonus: increment(bonus)
            },
            { merge: true }
        );

        alert("Transaction completed successfully");

    } catch (error) {

        console.error("Transaction completion error:", error);

        alert("Failed to complete transaction");
    }
};
// ================================
// SELLER DASHBOARD STATS
// ================================

const sellerSalesQuery = query(
    collection(db, "sales"),
    where("seller_name", "==", sellerData.name)
);

onSnapshot(sellerSalesQuery, (snapshot) => {

    let totalSales = 0;

    // store unique clients
    const uniqueClients = new Set();

    snapshot.docs.forEach((documentSnapshot) => {

        const data = documentSnapshot.data();

        // sum seller income
        totalSales += Number(
            data.total_income_for_seller || 0
        );

        // unique client
        if (data.client_name) {
            uniqueClients.add(data.client_name);
        }
    });

    // update UI
    const salesElement = document.getElementById("seller_total_sales");

    const clientsElement = document.getElementById("seller_total_clients");

    if (salesElement) {
        salesElement.innerText =
            "$" + totalSales.toFixed(2);
    }

    if (clientsElement) {
        clientsElement.innerText =
            uniqueClients.size;
    }
});
// ================================
// DASHBOARD STATS (CLEAN VERSION)
// ================================

const dashboardQuery = query(
    collection(db, "transactions"),
    where("seller_name", "==", sellerData.name)
);

onSnapshot(dashboardQuery, (snapshot) => {

    let pending = 0;
    let done = 0;
    let waitingValue = 0;

    snapshot.docs.forEach(docSnap => {

        const data = docSnap.data();

        const status = data.status || "pending";

        const income = Number(data.total_price || 0);

        // =====================
        // PENDING
        // =====================
        if (status === "pending") {
            pending++;
            waitingValue += income;
        }

        // =====================
        // DONE
        // =====================
        if (status === "done") {
            done++;
        }
    });

    // =====================
    // UPDATE UI
    // =====================
    const pendingEl = document.getElementById("seller_pending_orders");
    const doneEl = document.getElementById("seller_done_transactions");
    const waitingValueEl = document.getElementById("seller_waiting_value");

    if (pendingEl) pendingEl.innerText = pending;
    if (doneEl) doneEl.innerText = done;

    if (waitingValueEl) {
        waitingValueEl.innerText = "$" + waitingValue.toFixed(2);
    }
});

// done 
const doneQuery = query(
    transactionsColl,
    where("seller_name", "==", sellerData.name),
    where("status", "==", "done")
);

onSnapshot(doneQuery, async (snapshot) => {

    const tableBody = document.getElementById("done_orders_table_body");
    const doneCounter = document.getElementById("seller_done_transactions");

    let html = "";
    let count = 0;

    for (const docSnap of snapshot.docs) {

        const data = docSnap.data();
        count++;

        let income = 0;

        // 🔥 FIX: match your Firestore fields
        const financeSnap = await getDocs(query(
            collection(db, "transaction_finance"),
            where("transaction_id", "==", data.transaction_id)
        ));

        financeSnap.forEach(doc => {
            income = doc.data().seller_income || 0;
        });

        const date = data.timestamp
            ? data.timestamp.toDate().toLocaleString()
            : "N/A";

        html += `
        <tr style="
            background:white;
            box-shadow:0 2px 6px rgba(0,0,0,0.08);
        ">
            <td>${data.transaction_id}</td>
            <td>${data.username || "-"}</td>
            <td>${data.phone_number || "-"}</td>
            <td>${data.product_name || "-"}</td>
            <td>${data.quantity || 0}</td>

            <td style="color:green;font-weight:bold;">
                $${Number(income).toFixed(2)}
            </td>

            <td>${date}</td>
        </tr>
        `;
    }

    tableBody.innerHTML = html;

    if (doneCounter) {
        doneCounter.innerText = count;
    }
});

// ================================
// KPI DASHBOARD LOGIC
// ================================

let kpiCache = {
    sales: [],
    transactions: [],
    inventoryCount: 0,
    outOfStockCount: 0,
    activeProducts: 0
};

// --- Listen to sales (done transactions) ---
const kpiSalesQuery = query(
    collection(db, "sales"),
    where("seller_name", "==", sellerData.name)
);

onSnapshot(kpiSalesQuery, (snapshot) => {
    kpiCache.sales = snapshot.docs.map(d => d.data());
    renderKPIs();
});

// --- Listen to all transactions (pending + done) ---
const kpiTxQuery = query(
    collection(db, "transactions"),
    where("seller_name", "==", sellerData.name)
);

onSnapshot(kpiTxQuery, (snapshot) => {
    kpiCache.transactions = snapshot.docs.map(d => d.data());
    renderKPIs();
});

// --- Listen to inventory count ---
onSnapshot(mycontainerquery, (snapshot) => {
    kpiCache.inventoryCount = snapshot.size;
    kpiCache.activeProducts = snapshot.docs.filter(d => d.data().status === true).length;
    renderKPIs();
});

// --- Listen to out of stock count ---
onSnapshot(outOfStockQuery, (snapshot) => {
    kpiCache.outOfStockCount = snapshot.size;
    renderKPIs();
});

// --- MAIN KPI RENDER FUNCTION ---
function renderKPIs() {

    const sales = kpiCache.sales;
    const tx = kpiCache.transactions;

    // ---- REVENUE ----
    const totalRevenue = sales.reduce(
        (sum, s) => sum + Number(s.total_income_for_seller || 0), 0
    );

    // ---- UNITS SOLD ----
    const unitsSold = sales.reduce(
        (sum, s) => sum + Number(s.quantity_sold || 0), 0
    );

    // ---- DONE / PENDING / TOTAL ----
    const doneOrders = tx.filter(t => t.status === "done").length;
    const pendingOrders = tx.filter(t => t.status === "pending").length;
    const totalOrders = tx.length;

    // ---- AVG ORDER VALUE ----
    const aov = doneOrders > 0 ? (totalRevenue / doneOrders) : 0;

    // ---- COMPLETION RATE ----
    const completionRate = totalOrders > 0
        ? ((doneOrders / totalOrders) * 100).toFixed(1)
        : 0;

    // ---- UNIQUE CUSTOMERS ----
    const customerCounts = {};
    sales.forEach(s => {
        const name = s.client_name || s.username;
        if (name) {
            customerCounts[name] = (customerCounts[name] || 0) + 1;
        }
    });
    const uniqueCustomers = Object.keys(customerCounts).length;

    // ---- REPEAT CUSTOMER RATE ----
    const repeatCustomers = Object.values(customerCounts).filter(c => c > 1).length;
    const repeatRate = uniqueCustomers > 0
        ? ((repeatCustomers / uniqueCustomers) * 100).toFixed(1)
        : 0;

    // ---- INVENTORY HEALTH ----
    const totalProducts = kpiCache.inventoryCount + kpiCache.outOfStockCount;
    const inventoryHealth = totalProducts > 0
        ? ((kpiCache.inventoryCount / totalProducts) * 100).toFixed(1)
        : 100;

    // ===== UPDATE UI =====
    setText("kpi_revenue", "$" + totalRevenue.toFixed(2));
    setText("kpi_aov", "$" + aov.toFixed(2));
    setText("kpi_completion", completionRate + "%");
    setText("kpi_units", unitsSold);
    setText("kpi_repeat", repeatRate + "%");
    setText("kpi_inventory_health", inventoryHealth + "%");
    setText("kpi_stock_sub",
        `${kpiCache.inventoryCount} in stock / ${kpiCache.outOfStockCount} out`);

    setText("kpi_total_orders", totalOrders);
    setText("kpi_done_orders", doneOrders);
    setText("kpi_pending_orders", pendingOrders);
    setText("kpi_out_of_stock", kpiCache.outOfStockCount);
    setText("kpi_unique_customers", uniqueCustomers);
    setText("kpi_active_products", kpiCache.activeProducts);

    // ===== TOP PRODUCTS =====
    const productMap = {};
    sales.forEach(s => {
        const name = s.product_name || "Unknown";
        if (!productMap[name]) {
            productMap[name] = { units: 0, revenue: 0 };
        }
        productMap[name].units += Number(s.quantity_sold || 0);
        productMap[name].revenue += Number(s.total_income_for_seller || 0);
    });

    const topProducts = Object.entries(productMap)
        .sort((a, b) => b[1].units - a[1].units)
        .slice(0, 5);

    const topBody = document.getElementById("kpi_top_products");
    if (topBody) {
        if (topProducts.length === 0) {
            topBody.innerHTML = `<tr><td colspan="4" style="padding:15px;text-align:center;color:#777;">No sales yet</td></tr>`;
        } else {
            topBody.innerHTML = topProducts.map(([name, data], i) => `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;">
                        <span style="background:#1976d2;color:white;padding:3px 8px;border-radius:50%;font-size:12px;">
                            #${i + 1}
                        </span>
                    </td>
                    <td style="padding:10px;font-weight:bold;">${name}</td>
                    <td style="padding:10px;">${data.units}</td>
                    <td style="padding:10px;color:green;font-weight:bold;">$${data.revenue.toFixed(2)}</td>
                </tr>
            `).join('');
        }
    }

    // ===== COUNTRY BREAKDOWN =====
    const countryMap = {};
    sales.forEach(s => {
        const c = s.country || "Unknown";
        countryMap[c] = (countryMap[c] || 0) + Number(s.total_income_for_seller || 0);
    });

    const countryDiv = document.getElementById("kpi_country_breakdown");
    if (countryDiv) {
        const entries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) {
            countryDiv.innerHTML = `<p style="color:#777;">No data yet</p>`;
        } else {
            countryDiv.innerHTML = entries.map(([country, revenue]) => `
                <div style="background:#f4f7f6;padding:12px;border-radius:8px;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#666;">${country}</p>
                    <h3 style="margin:5px 0 0;color:#1976d2;">$${revenue.toFixed(2)}</h3>
                </div>
            `).join('');
        }
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}