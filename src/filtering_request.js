import { initializeApp } from "firebase/app";

import {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    deleteDoc,
    runTransaction,
    query,
    where,
    getDocs,
    addDoc,
} from "firebase/firestore";
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
const tableBody = document.getElementById('requested_seller_body');
const acceptModal = document.getElementById('accept_modal');

// --- PENDING REQUESTS LOGIC ---
onSnapshot(collection(db, 'request_registration'), (snapshot) => {
    let html = '';
    snapshot.docs.forEach(documentSnapshot => {
        const data = documentSnapshot.data();
        const docId = documentSnapshot.id;
        const imageSrc = data.profile_image || 'https://via.placeholder.com/50';

        html += `
        <tr id="row-${docId}">
            <td>${data.name}</td>
            <td>${data.phonenumber}</td>
            <td>${data.email}</td>
            <td>${data.country}</td>
            <td>${data.product_category}</td>
            <td><img src="${imageSrc}" style="width:50px; height:50px; object-fit:cover;"></td>
            <td>
                <button class="accept-btn" 
                    data-id="${docId}"
                    data-name="${data.name}" 
                    data-email="${data.email}"
                    data-phone="${data.phonenumber}"
                    data-country="${data.country}"
                    data-category="${data.product_category}"
                    data-img="${data.profile_image}">Accept</button>
                <button class="reject-btn" data-phone="${data.phonenumber}" style="background:#f44336; color:white;">Reject</button>
            </td>
        </tr>`;
    });
    if (tableBody) {
        tableBody.innerHTML = html;
        attachListeners();
    }
});

function attachListeners() {
    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const phone = e.currentTarget.dataset.phone;
            if (confirm(`Delete request for phone: ${phone}?`)) {
                await deleteRequestByPhone(phone);
            }
        };
    });

    document.querySelectorAll('.accept-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const info = e.currentTarget.dataset;
            const sellerPhone = info.phone;
            const password = `${info.name.replace(/\s+/g, '')}123`;
            try {
                const counterRef = doc(db, 'app_data', 'seller_counter'); 
                let finalId;

                await runTransaction(db, async (transaction) => {
                    const counterDoc = await transaction.get(counterRef);
                    let nextId = 1212;
                    if (counterDoc.exists()) {
                        nextId = (counterDoc.data().currentId || 1212) + 1;
                    }
                    finalId = nextId;
                    const newSellerRef = doc(db, 'sellers', nextId.toString());
                    transaction.set(newSellerRef, {
                        seller_id: nextId,
                        password: password,
                        name: info.name,
                        phonenumber: sellerPhone,
                        email: info.email,
                        country: info.country,
                        product_category: info.category,
                        profile_image: info.img,
                        status: 'active',
                        joinedAt: new Date()
                    });
                    transaction.set(counterRef, { currentId: nextId }, { merge: true });
                });
                await deleteRequestByPhone(sellerPhone);
                showAcceptModal(finalId, password, info.email, info.name);
            } catch (error) {
                console.error("Acceptance error:", error);
            }
        };
    });
}

async function deleteRequestByPhone(phone) {
    const q = query(collection(db, 'request_registration'), where("phonenumber", "==", phone));
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(db, 'request_registration', d.id)));
    await Promise.all(deletePromises);
}

function showAcceptModal(id, pass, email, name) {
    document.getElementById('new_seller_id').innerText = id;
    document.getElementById('new_seller_pass').innerText = pass;
    if (acceptModal) acceptModal.style.display = 'flex';

    document.getElementById('send_email_btn').onclick = () => {
        const subject = encodeURIComponent("Zing Store - Your Account is Approved!");
        const body = encodeURIComponent(`Hello ${name},\n\nYour account is ready.\nID: ${id}\nPassword: ${pass}`);
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    };
}

document.getElementById('close_modal')?.addEventListener('click', () => {
    if (acceptModal) acceptModal.style.display = 'none';
});

// --- SELLERS MANAGEMENT LOGIC ---
const sellertable = document.getElementById('seller_list');
const seller_table_reference = collection(db, 'sellers'); 

onSnapshot(seller_table_reference, (snapshot) => {
    let html = '';
    snapshot.docs.forEach(documentSnapshot => {
        const data = documentSnapshot.data();
        const docId = documentSnapshot.id;
        const imageSrc = data.profile_image || 'https://via.placeholder.com/50';

        html += `
        <tr id="row-${docId}">
            <td>${data.seller_id}</td>
            <td>${data.name}</td>
            <td>${data.password}</td>
            <td>${data.phonenumber}</td>
            <td>${data.email}</td>
            <td>${data.country}</td>
            <td>${data.product_category}</td>
            <td><img src="${imageSrc}" style="width:50px; height:50px; object-fit:cover;"></td>
        </tr>`;
    });
    if (sellertable) {
        sellertable.innerHTML = html;
    }
});

const searchFormSeller = document.getElementById('searchseller');
searchFormSeller?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const searchTerm = document.getElementById('searchsellername').value.trim();
    let searchquery = query(seller_table_reference, where("name", "==", searchTerm));
    try {
        const querySnapshot = await getDocs(searchquery);
        let html = "";
        if (querySnapshot.empty) {
            html = '<tr><td colspan="8">No seller found with that name.</td></tr>';
        } else {
            querySnapshot.forEach(docSnap => {
                const data = docSnap.data();
                const imageSrc = data.profile_image || 'https://via.placeholder.com/50';
                html += `<tr><td>${data.seller_id}</td><td>${data.name}</td><td>${data.password}</td><td>${data.phonenumber}</td><td>${data.email}</td><td>${data.country}</td><td>${data.product_category}</td><td><img src="${imageSrc}" style="width:50px; height:50px;"></td></tr>`;
            });
        }
        sellertable.innerHTML = html;
    } catch (error) {
        console.error("Search error:", error);
    }
});

// --- USERS MANAGEMENT LOGIC ---
// --- USERS MANAGEMENT LOGIC (UPDATED WITH PLACEHOLDER) ---
const userstable = document.getElementById('users_list');
const users_table_reference = collection(db, 'users'); 

onSnapshot(users_table_reference, (snapshot) => {
    let html = '';
    
    if (snapshot.empty) {
        html = '<tr><td colspan="5" style="text-align:center;">No users found.</td></tr>';
    } else {
        snapshot.docs.forEach(documentSnapshot => {
            const data = documentSnapshot.data();

            // 1. Handle missing image (WhatsApp-style gray placeholder)
            // Using a standard UI avatar placeholder service
            const imageSrc = (data.profile_url && data.profile_url.trim() !== "") 
                             ? data.profile_url 
                             : 'https://ui-avatars.com/api/?name=' + (data.username || 'U') + '&background=cccccc&color=ffffff';

            html += `
            <tr>
                <td>${data.username || 'Unnamed'}</td>
                <td>${data.phone_number || 'No Phone'}</td>
                <td>${data.country || 'Lebanon'}</td>
                <td>${data.number_of_points ?? 0}</td>
                <td>
                    <img src="${imageSrc}" 
                         style="width:40px; height:40px; border-radius:50%; object-fit:cover; background:#eee; border:1px solid #ddd;"
                         onerror="this.src='https://ui-avatars.com/api/?background=ccc&color=fff&name=?'">
                </td>
            </tr>`;
        });
    }

    if (userstable) {
        userstable.innerHTML = html;
    }
});
////PRIZE DEPARTEMENT
const coll_name = 'prizes';

const prizes_collection = collection(db, coll_name);

const add_prize = document.getElementById('add_to_prize_collection');

if (add_prize) {

    add_prize.addEventListener('click', async (e) => {

        e.preventDefault();

        const fileInput = document.getElementById('image');

        const files = fileInput ? fileInput.files : [];

        if (files.length === 0) {

            alert("Please upload at least one image");

            return;
        }

        try {

            const build_array = [];

            // Convert all images to Base64
            for (const file of files) {

                // Optional compression limit
                if (file.size > 500 * 1024) {

                    alert(`Image ${file.name} is too large. Max 500KB.`);

                    return;
                }

                const base64Image = await new Promise((resolve, reject) => {

                    const reader = new FileReader();

                    reader.readAsDataURL(file);

                    reader.onload = () => resolve(reader.result);

                    reader.onerror = reject;
                });

                build_array.push(base64Image);
            }

            const prize_name =
                document.getElementById('prize_name').value;

            const priceInput =
                document.getElementById('price').value;

            const prize_price = parseFloat(priceInput);

            if (isNaN(prize_price)) {

                alert("Please enter a valid numeric price");

                return;
            }

            const number_of_points_required =
                Number((prize_price * 0.4).toFixed(2));
const prize_category = document.getElementById('prize_category').value;

if (!prize_category) {
    alert("Please select a category");
    return;
}
            await addDoc(prizes_collection, {

                prize_name: prize_name,

                prize_price: prize_price,

                number_of_points_required:
                    number_of_points_required,
                prize_category: prize_category, 

                images: build_array,

                createdAt: new Date()
            });

            alert("Prize added successfully");

            document.querySelector('.add_prize').reset();

        } catch (error) {

            console.error("Error saving to Firestore:", error);

            alert("Failed to add prize.");
        }
    });
}
const prizetable = document.getElementById('prizes_list');
const prizes_table_refrence = collection(db, 'prizes'); 

onSnapshot(prizes_table_refrence, (snapshot) => {
    let html = '';
    
    if (snapshot.empty) {
        html = '<tr><td colspan="5" style="text-align:center;">No prixes found.</td></tr>';
    } else {
        snapshot.docs.forEach(documentSnapshot => {
            const data = documentSnapshot.data();

            // 1. Handle missing image (WhatsApp-style gray placeholder)
            // Using a standard UI avatar placeholder service
            const imageSrc =
                data.images &&
                data.images.length > 0
                    ? data.images[0]
                    : 'https://via.placeholder.com/50';

            html += `
<tr data-id="${documentSnapshot.id}">
    <td>${data.prize_name || 'Unnamed'}</td>
    <td>${data.prize_category || '-'}</td>   <!-- add this -->
    <td>${data.prize_price || 0}</td>
    <td>${data.number_of_points_required ?? 0}</td>
    <td>
        <img src="${imageSrc}" style="width:40px;height:40px;border-radius:50%;">
    </td>
</tr>`;
        });
    }

    if (prizetable) {
    prizetable.innerHTML = html;
}
});

///Dashboard view 
const salesCollection = collection(db, "sales");

onSnapshot(salesCollection, (snapshot) => {

    let totalSales = 0;
    let totalSellerIncome = 0;
    let totalProfit = 0;
    let totalBonus = 0;

    snapshot.forEach((docSnap) => {

        const data = docSnap.data();

        totalSellerIncome += Number(
            data.total_income_for_seller || 0
        );

        totalProfit += Number(
            data.profit_for_platform || 0
        );

        totalBonus += Number(
            data.bonus_for_client || 0
        );

        totalSales += Number(
            data.total_income_for_seller || 0
        ) + Number(
            data.profit_for_platform || 0
        );
    });

    // UPDATE UI
    document.getElementById(
        "dashboard_total_sales"
    ).innerText =
        "$" + totalSales.toFixed(2);

    document.getElementById(
        "dashboard_seller_income"
    ).innerText =
        "$" + totalSellerIncome.toFixed(2);

    document.getElementById(
        "dashboard_total_profit"
    ).innerText =
        "$" + totalProfit.toFixed(2);

    document.getElementById(
        "dashboard_total_bonus"
    ).innerText =
        "$" + totalBonus.toFixed(2);
});

// the done transactions 
// ===============================
// DASHBOARD SALES TABLE
// ===============================

const dashboardSalesTable =
    document.getElementById(
        "dashboard_sales_table"
    );

onSnapshot(salesCollection, (snapshot) => {

    if (!dashboardSalesTable) return;

    let html = "";

    snapshot.forEach((docSnap) => {

        const data = docSnap.data();

        let date = "N/A";

        if (data.timestamp) {

            if (data.timestamp.toDate) {

                date = data.timestamp
                    .toDate()
                    .toLocaleString();

            } else {

                date = new Date(
                    data.timestamp
                ).toLocaleString();
            }
        }

        html += `
        <tr style="
            border-bottom:1px solid #ddd;
        ">

            <td style="padding:12px;">
                ${data.transaction_id || "-"}
            </td>

            <td>
                ${data.seller_name || "-"}
            </td>

            <td>
                ${data.client_name || "-"}
            </td>

            <td>
    ${data.country || "-"}
</td>

            <td>
                ${data.product_name || "-"}
            </td>

            <td>
                ${data.quantity_sold || 0}
            </td>

            <td style="
                color:green;
                font-weight:bold;
            ">
                $${Number(
                    data.total_income_for_seller || 0
                ).toFixed(2)}
            </td>

            <td style="
                color:orange;
                font-weight:bold;
            ">
                $${Number(
                    data.profit_for_platform || 0
                ).toFixed(2)}
            </td>

            <td style="
                color:#d32f2f;
                font-weight:bold;
            ">
                $${Number(
                    data.bonus_for_client || 0
                ).toFixed(2)}
            </td>

            <td>
                ${date}
            </td>

        </tr>
        `;
    });

    dashboardSalesTable.innerHTML =
        html || `
        <tr>
            <td colspan="10"
                style="
                    padding:20px;
                    text-align:center;
                ">
                No transactions found
            </td>
        </tr>
        `;
});

// ========================================
// ALL TRANSACTIONS TABLE
// ========================================

const pendingTransactionsTable =
    document.getElementById(
        "pending_transactions_table"
    );

const transactionsCollection =
    collection(db, "transactions");

const financeCollection =
    collection(db, "transaction_finance");

// realtime transactions
onSnapshot(query(transactionsCollection, where("status", "==", "pending")), async (snapshot) => {

    if (!pendingTransactionsTable) return;

    let html = "";

    for (const docSnap of snapshot.docs) {

        const transaction =
            docSnap.data();

        // ==========================
        // GET FINANCE INFO
        // ==========================

        let sellerIncome = 0;
        let profit = 0;
        let bonus = 0;

        try {

            const financeQuery = query(
                financeCollection,
                where(
                    "transaction_id",
                    "==",
                    transaction.transaction_id
                )
            );

            const financeSnapshot =
                await getDocs(financeQuery);

            if (!financeSnapshot.empty) {

                const financeData =
                    financeSnapshot.docs[0].data();

                sellerIncome =
                    financeData.seller_income || 0;

                profit =
                    financeData.profit || 0;

                bonus =
                    financeData.bonus_reserve || 0;
            }

        } catch (error) {

            console.error(
                "Finance fetch error:",
                error
            );
        }

        // ==========================
        // DATE
        // ==========================

        let date = "N/A";

        if (transaction.timestamp) {

            if (transaction.timestamp.toDate) {

                date =
                    transaction.timestamp
                    .toDate()
                    .toLocaleString();

            } else {

                date = new Date(
                    transaction.timestamp
                ).toLocaleString();
            }
        }

        // ==========================
        // BUILD TABLE
        // ==========================

        html += `

        <tr style="
            border-bottom:1px solid #ddd;
        ">

            <td style="padding:12px;">
                ${transaction.transaction_id || "-"}
            </td>

            <td>
                ${transaction.username || "-"}
            </td>

            <td>
                ${transaction.phone_number || "-"}
            </td>

            <td>
                ${transaction.country || "-"}
            </td>

            <td>
                ${transaction.seller_name || "-"}
            </td>

            <td>
                ${transaction.product_name || "-"}
            </td>

            <td>
                ${transaction.quantity || 0}
            </td>

            <td style="
                color:#1976d2;
                font-weight:bold;
            ">
                $${Number(
                    transaction.total_price || 0
                ).toFixed(2)}
            </td>

            <td style="
                color:green;
                font-weight:bold;
            ">
                $${Number(
                    sellerIncome
                ).toFixed(2)}
            </td>

            <td style="
                color:orange;
                font-weight:bold;
            ">
                $${Number(
                    profit
                ).toFixed(2)}
            </td>

            <td style="
                color:#d32f2f;
                font-weight:bold;
            ">
                $${Number(
                    bonus
                ).toFixed(2)}
            </td>

            <td>

                <span style="
                    padding:6px 10px;
                    border-radius:6px;
                    color:white;
                    font-size:12px;
                    background:
                    ${transaction.status === "done"
                        ? "green"
                        : "orange"};
                ">

                    ${transaction.status || "-"}

                </span>

            </td>

            <td>
                ${date}
            </td>

        </tr>
        `;
    }

    pendingTransactionsTable.innerHTML =

        html ||

        `
        <tr>

            <td colspan="13"
                style="
                    padding:20px;
                    text-align:center;
                ">

                No transactions found

            </td>

        </tr>
        `;
});

// =====================================
// PENDING TRANSACTIONS STATS
// =====================================

const pendingTransactionsQuery = query(
    collection(db, "transactions"),
    where("status", "==", "pending")
);

onSnapshot(pendingTransactionsQuery, async (snapshot) => {

    // COUNTERS
    let totalTransactions = 0;

    let totalDealsValue = 0;

    let totalSellerIncome = 0;

    let totalProfit = 0;

    let totalBonus = 0;

    // LOOP TRANSACTIONS
    for (const docSnap of snapshot.docs) {

        totalTransactions++;

        const transactionData = docSnap.data();

        // total transaction value
        totalDealsValue += Number(
            transactionData.total_price || 0
        );

        // =========================
        // GET FINANCE DATA
        // =========================
        try {

            const financeQuery = query(
                collection(db, "transaction_finance"),
                where(
                    "transaction_id",
                    "==",
                    transactionData.transaction_id
                )
            );

            const financeSnapshot =
                await getDocs(financeQuery);

            if (!financeSnapshot.empty) {

                const financeData =
                    financeSnapshot.docs[0].data();

                totalSellerIncome += Number(
                    financeData.seller_income || 0
                );

                totalProfit += Number(
                    financeData.profit || 0
                );

                totalBonus += Number(
                    financeData.bonus_reserve || 0
                );
            }

        } catch (error) {

            console.error(
                "Finance fetch error:",
                error
            );
        }
    }

    // =========================
    // UPDATE UI
    // =========================

    document.getElementById(
        "waiting_transactions_count"
    ).innerText = totalTransactions;

    document.getElementById(
        "waiting_total_value"
    ).innerText =
        "$" + totalDealsValue.toFixed(2);

    document.getElementById(
        "waiting_seller_income"
    ).innerText =
        "$" + totalSellerIncome.toFixed(2);

    document.getElementById(
        "waiting_profit"
    ).innerText =
        "$" + totalProfit.toFixed(2);

    document.getElementById(
        "waiting_bonus"
    ).innerText =
        "$" + totalBonus.toFixed(2);
});

// ===============================
// PRIZES WINNERS
// ===============================

const pendingBody = document.getElementById("winners_pending_body");
const confirmedBody = document.getElementById("winners_confirmed_body");

// Attach confirm button listener ONCE
if (pendingBody) {
    pendingBody.addEventListener("click", async (e) => {
        const btn = e.target.closest(".confirm-prize-btn");
        if (!btn) return;

        const id = btn.dataset.id;
        btn.disabled = true;
        btn.innerText = "Confirming...";

        try {
            const prizeRef = doc(db, "users_prizes", id);
            await runTransaction(db, async (transaction) => {
                transaction.update(prizeRef, {
                    check_admin: true,
                    confirmed_at: new Date()
                });
            });
            alert("Prize confirmed!");
        } catch (error) {
            console.error("Confirm error:", error);
            alert("Failed to confirm prize");
            btn.disabled = false;
            btn.innerText = "Confirm Prize";
        }
    });
}

// PENDING WINNERS (check_admin = false)
const pendingWinnersQuery = query(
    collection(db, "users_prizes"),
    where("check_admin", "==", false)
);

onSnapshot(pendingWinnersQuery, (snapshot) => {

    // update counter
    const countEl = document.getElementById("waiting_winners_count");
    if (countEl) countEl.innerText = snapshot.size;

    if (!pendingBody) return;

    if (snapshot.empty) {
        pendingBody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center;padding:20px;">
                No pending prize winners
            </td>
        </tr>`;
        return;
    }

    let html = "";
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;

        html += `
        <tr>
            <td style="padding:10px;">${data.winner_name || "-"}</td>
            <td>${data.winner_phone_number || "-"}</td>
            <td>${data.winner_country || "-"}</td>
            <td>${data.prize_name || "-"}</td>
            <td>${data.quantity || 0}</td>
            <td>${data.total_points_used || 0}</td>
            <td>
                <button 
                    class="confirm-prize-btn"
                    data-id="${docId}"
                    style="
                        background:#1976d2;
                        color:white;
                        padding:8px 14px;
                        border:none;
                        border-radius:6px;
                        cursor:pointer;
                    ">
                    Confirm Prize
                </button>
            </td>
        </tr>`;
    });

    pendingBody.innerHTML = html;
});

// CONFIRMED WINNERS (check_admin = true)
const confirmedWinnersQuery = query(
    collection(db, "users_prizes"),
    where("check_admin", "==", true)
);

onSnapshot(confirmedWinnersQuery, (snapshot) => {

    // update counter
    const countEl = document.getElementById("confirmed_winners_count");
    if (countEl) countEl.innerText = snapshot.size;

    if (!confirmedBody) return;

    if (snapshot.empty) {
        confirmedBody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center;padding:20px;">
                No confirmed winners yet
            </td>
        </tr>`;
        return;
    }

    let html = "";
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        let confirmedDate = "-";
        if (data.confirmed_at) {
            confirmedDate = data.confirmed_at.toDate
                ? data.confirmed_at.toDate().toLocaleString()
                : new Date(data.confirmed_at).toLocaleString();
        }

        html += `
        <tr>
            <td style="padding:10px;">${data.winner_name || "-"}</td>
            <td>${data.winner_phone_number || "-"}</td>
            <td>${data.winner_country || "-"}</td>
            <td>${data.prize_name || "-"}</td>
            <td>${data.quantity || 0}</td>
            <td>${data.total_points_used || 0}</td>
            <td style="color:green;font-weight:bold;">${confirmedDate}</td>
        </tr>`;
    });

    confirmedBody.innerHTML = html;
});
// ===============================
// ADVERTISEMENTS
// ===============================

const adsCollection = collection(db, "advertisements");

// ADD ADVERTISEMENT
const addAdBtn = document.getElementById("add_advertisement_btn");

if (addAdBtn) {
    addAdBtn.addEventListener("click", async () => {

        const name        = document.getElementById("ad_name").value.trim();
        const clientName  = document.getElementById("ad_client_name").value.trim();
        const clientPhone = document.getElementById("ad_client_phone").value.trim();
        const price       = parseFloat(document.getElementById("ad_price").value);
        const packageType = document.getElementById("ad_package_type").value;
        const quantity    = parseInt(document.getElementById("ad_quantity").value);
        const startDate   = document.getElementById("ad_start_date").value;
        const endDate     = document.getElementById("ad_end_date").value;
        const fileInput   = document.getElementById("ad_image");
        const file        = fileInput?.files[0];

        // VALIDATION
        if (!name || !clientName || !clientPhone || isNaN(price) || !packageType || isNaN(quantity) || !startDate || !endDate) {
            alert("Please fill in all fields.");
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            alert("End date cannot be before start date.");
            return;
        }

        addAdBtn.disabled    = true;
        addAdBtn.innerText   = "Saving...";

        try {

            let imageBase64 = "";

            if (file) {
                if (file.size > 500 * 1024) {
                    alert("Image too large. Max 500KB.");
                    addAdBtn.disabled  = false;
                    addAdBtn.innerText = "+ Add Advertisement";
                    return;
                }

                imageBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload  = () => resolve(reader.result);
                    reader.onerror = reject;
                });
            }

            // STATUS based on dates
            const today  = new Date();
            today.setHours(0, 0, 0, 0);
            const start  = new Date(startDate);
            const end    = new Date(endDate);
            if (today >= start && today <= end) status = "Active";
            if (today > end)                    status = "Expired";

            await addDoc(adsCollection, {
                ad_name:      name,
                client_name:  clientName,
                client_phone: clientPhone,
                price:        price,
                package_type: packageType,
                quantity:     quantity,
                start_date:   startDate,
                end_date:     endDate,
                image:        imageBase64,
                createdAt:    new Date()
            });

            alert("Advertisement added successfully!");

            // RESET FORM
            ["ad_name","ad_client_name","ad_client_phone","ad_price",
             "ad_quantity","ad_start_date","ad_end_date"].forEach(id => {
                document.getElementById(id).value = "";
            });
            document.getElementById("ad_package_type").selectedIndex = 0;
            if (fileInput) fileInput.value = "";

        } catch (err) {
            console.error("Ad error:", err);
            alert("Failed to add advertisement.");
        } finally {
            addAdBtn.disabled  = false;
            addAdBtn.innerText = "+ Add Advertisement";
        }
    });
}

// LISTEN ADS
const adsTableBody = document.getElementById("ads_table_body");

onSnapshot(adsCollection, (snapshot) => {

    let totalRevenue  = 0;
    let totalPackages = 0;
    let html          = "";

    if (snapshot.empty) {
        html = `<tr><td colspan="11" style="text-align:center;padding:24px;color:#9ca3af;">No advertisements yet.</td></tr>`;
    } else {

        snapshot.forEach((docSnap) => {

            const data  = docSnap.data();
            const docId = docSnap.id;

            totalRevenue  += Number(data.price    || 0);
            totalPackages += Number(data.quantity || 0);

            const imgSrc = data.image
                ? data.image
                : "https://ui-avatars.com/api/?name=AD&background=1976d2&color=fff";

            // STATUS BADGE
            const statusColor = {
                "Active":   "badge-done",
                "Upcoming": "badge-active",
                "Expired":  "badge-pending"
            }[data.status] || "badge-pending";

            html += `
            <tr>
                <td>
                    <img src="${imgSrc}"
                         style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;">
                </td>
                <td style="font-weight:600;">${data.ad_name || "-"}</td>
                <td>${data.client_name || "-"}</td>
                <td>${data.client_phone || "-"}</td>
                <td>${data.package_type || "-"}</td>
                <td style="font-weight:600;">${data.quantity || 0}</td>
                <td style="color:var(--success);font-weight:700;">
                    $${Number(data.price || 0).toFixed(2)}
                </td>
                <td>${data.start_date || "-"}</td>
                <td>${data.end_date || "-"}</td>
                <td>
                    <button
                        class="btn-danger delete-ad-btn"
                        data-id="${docId}"
                        style="font-size:12px;padding:6px 12px;">
                        🗑 Delete
                    </button>
                </td>
            </tr>`;
        });
    }

    if (adsTableBody) {
        adsTableBody.innerHTML = html;
        attachAdDeleteListeners();
    }

    // UPDATE STATS
    const countEl    = document.getElementById("ads_total_count");
    const revenueEl  = document.getElementById("ads_total_revenue");
    const packagesEl = document.getElementById("ads_total_packages");

    if (countEl)    countEl.innerText    = snapshot.size;
    if (revenueEl)  revenueEl.innerText  = "$" + totalRevenue.toFixed(2);
    if (packagesEl) packagesEl.innerText = totalPackages;
});

// DELETE AD
function attachAdDeleteListeners() {
    document.querySelectorAll(".delete-ad-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            if (!confirm("Delete this advertisement?")) return;
            try {
                await deleteDoc(doc(db, "advertisements", id));
            } catch (err) {
                console.error("Delete error:", err);
                alert("Failed to delete.");
            }
        });
    });
}
// =====================================================
// ADMIN KPI DASHBOARD
// =====================================================

const kpiState = {
    sales: [],
    transactions: [],
    finances: [],
    users: [],
    sellers: [],
    ads: [],
    prizes: [],
    redemptions: []
};

// ─── LISTEN TO SALES (Done Transactions) ───
onSnapshot(collection(db, "sales"), (snap) => {
    kpiState.sales = snap.docs.map(d => d.data());
    renderAdminKPIs();
});

// ─── LISTEN TO ALL TRANSACTIONS ───
onSnapshot(collection(db, "transactions"), (snap) => {
    kpiState.transactions = snap.docs.map(d => d.data());
    renderAdminKPIs();
});

// ─── LISTEN TO FINANCE ───
onSnapshot(collection(db, "transaction_finance"), (snap) => {
    kpiState.finances = snap.docs.map(d => d.data());
    renderAdminKPIs();
});

// ─── LISTEN TO USERS ───
onSnapshot(collection(db, "users"), (snap) => {
    kpiState.users = snap.docs.map(d => d.data());
    renderAdminKPIs();
});

// ─── LISTEN TO SELLERS ───
onSnapshot(collection(db, "sellers"), (snap) => {
    kpiState.sellers = snap.docs.map(d => d.data());
    renderAdminKPIs();
});

// ─── LISTEN TO ADS ───
onSnapshot(collection(db, "advertisements"), (snap) => {
    kpiState.ads = snap.docs.map(d => d.data());
    renderAdminKPIs();
});

// ─── LISTEN TO PRIZES ───
onSnapshot(collection(db, "prizes"), (snap) => {
    kpiState.prizes = snap.docs.map(d => d.data());
    renderAdminKPIs();
});

// ─── LISTEN TO PRIZE REDEMPTIONS ───
onSnapshot(collection(db, "users_prizes"), (snap) => {
    kpiState.redemptions = snap.docs.map(d => d.data());
    renderAdminKPIs();
});

// ─── MAIN RENDER FUNCTION ───
function renderAdminKPIs() {

    const { sales, transactions, users, sellers, ads, prizes, redemptions } = kpiState;

    // ════════════════════════════════
    // FINANCIAL METRICS
    // ════════════════════════════════

    let sellerIncome = 0;
    let platformProfit = 0;
    let bonusPool = 0;
    let unitsSold = 0;

    sales.forEach(s => {
        sellerIncome   += Number(s.total_income_for_seller || 0);
        platformProfit += Number(s.profit_for_platform || 0);
        bonusPool      += Number(s.bonus_for_client || 0);
        unitsSold      += Number(s.quantity_sold || 0);
    });

    // GMV = total transaction value (seller income + platform profit + bonus)
    const gmv = sellerIncome + platformProfit + bonusPool;

    // Net Revenue = what platform keeps (profit only)
    const netRevenue = platformProfit;

    const doneOrders    = sales.length;
    const pendingOrders = transactions.filter(t => t.status === "pending").length;
    const totalOrders   = transactions.length;

    const aov = doneOrders > 0 ? (gmv / doneOrders) : 0;
    const profitMargin = gmv > 0 ? ((platformProfit / gmv) * 100) : 0;
    const completionRate = totalOrders > 0 ? ((doneOrders / totalOrders) * 100) : 0;

    setKPI("kpi_gmv",            "$" + gmv.toFixed(2));
    setKPI("kpi_net_revenue",    "$" + netRevenue.toFixed(2));
    setKPI("kpi_aov",            "$" + aov.toFixed(2));
    setKPI("kpi_profit_margin",  profitMargin.toFixed(1) + "%");
    setKPI("kpi_bonus_pool",     "$" + bonusPool.toFixed(2));

    setKPI("kpi_total_orders",     totalOrders);
    setKPI("kpi_completion_rate",  completionRate.toFixed(1) + "%");
    setKPI("kpi_pending_count",    pendingOrders);
    setKPI("kpi_units_sold",       unitsSold);

    // ════════════════════════════════
    // MARKETPLACE HEALTH
    // ════════════════════════════════

    const totalUsers   = users.length;
    const totalSellers = sellers.length;

    // Repeat buyer rate
    const buyerCount = {};
    sales.forEach(s => {
        const name = s.client_name;
        if (name) buyerCount[name] = (buyerCount[name] || 0) + 1;
    });
    const uniqueBuyers   = Object.keys(buyerCount).length;
    const repeatBuyers   = Object.values(buyerCount).filter(c => c > 1).length;
    const repeatRate     = uniqueBuyers > 0 ? ((repeatBuyers / uniqueBuyers) * 100) : 0;

    const arpu = totalUsers   > 0 ? (gmv / totalUsers)   : 0; // Avg Revenue Per User
    const arps = totalSellers > 0 ? (gmv / totalSellers) : 0; // Avg Revenue Per Seller

    setKPI("kpi_total_users",   totalUsers);
    setKPI("kpi_total_sellers", totalSellers);
    setKPI("kpi_repeat_rate",   repeatRate.toFixed(1) + "%");
    setKPI("kpi_arpu",          "$" + arpu.toFixed(2));
    setKPI("kpi_arps",          "$" + arps.toFixed(2));

    // ════════════════════════════════
    // ENGAGEMENT & REWARDS
    // ════════════════════════════════

    const prizesRedeemed = redemptions.length;

    const pointsDistributed = users.reduce(
        (sum, u) => sum + Number(u.number_of_points || 0), 0
    );

    const adRevenue = ads.reduce(
        (sum, a) => sum + Number(a.price || 0), 0
    );

    setKPI("kpi_prizes_redeemed",     prizesRedeemed);
    setKPI("kpi_points_distributed",  pointsDistributed.toLocaleString());
    setKPI("kpi_ad_revenue",          "$" + adRevenue.toFixed(2));
    setKPI("kpi_active_prizes",       prizes.length);

    // ════════════════════════════════
    // TOP SELLERS
    // ════════════════════════════════

    const sellerMap = {};
    sales.forEach(s => {
        const name = s.seller_name || "Unknown";
        if (!sellerMap[name]) sellerMap[name] = { orders: 0, revenue: 0 };
        sellerMap[name].orders++;
        sellerMap[name].revenue += Number(s.total_income_for_seller || 0);
    });

    const topSellers = Object.entries(sellerMap)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5);

    const topSellersBody = document.getElementById("kpi_top_sellers");
    if (topSellersBody) {
        topSellersBody.innerHTML = topSellers.length === 0
            ? `<tr><td colspan="4" style="text-align:center;padding:18px;color:#9ca3af;">No data yet</td></tr>`
            : topSellers.map(([name, d], i) => `
                <tr>
                    <td><span class="badge badge-active">#${i + 1}</span></td>
                    <td style="font-weight:600;">${name}</td>
                    <td>${d.orders}</td>
                    <td style="color:var(--success);font-weight:700;">$${d.revenue.toFixed(2)}</td>
                </tr>
            `).join('');
    }

    // ════════════════════════════════
    // TOP PRODUCTS
    // ════════════════════════════════

    const productMap = {};
    sales.forEach(s => {
        const name = s.product_name || "Unknown";
        if (!productMap[name]) productMap[name] = { units: 0, revenue: 0 };
        productMap[name].units   += Number(s.quantity_sold || 0);
        productMap[name].revenue += Number(s.total_income_for_seller || 0)
                                  + Number(s.profit_for_platform || 0);
    });

    const topProducts = Object.entries(productMap)
        .sort((a, b) => b[1].units - a[1].units)
        .slice(0, 5);

    const topProductsBody = document.getElementById("kpi_top_products");
    if (topProductsBody) {
        topProductsBody.innerHTML = topProducts.length === 0
            ? `<tr><td colspan="4" style="text-align:center;padding:18px;color:#9ca3af;">No data yet</td></tr>`
            : topProducts.map(([name, d], i) => `
                <tr>
                    <td><span class="badge badge-done">#${i + 1}</span></td>
                    <td style="font-weight:600;">${name}</td>
                    <td>${d.units}</td>
                    <td style="color:var(--blue);font-weight:700;">$${d.revenue.toFixed(2)}</td>
                </tr>
            `).join('');
    }

    // ════════════════════════════════
    // COUNTRY BREAKDOWN
    // ════════════════════════════════

    const countryMap = {};
    sales.forEach(s => {
        const c = s.country || "Unknown";
        if (!countryMap[c]) countryMap[c] = { orders: 0, revenue: 0, profit: 0 };
        countryMap[c].orders++;
        countryMap[c].revenue += Number(s.total_income_for_seller || 0)
                               + Number(s.profit_for_platform || 0)
                               + Number(s.bonus_for_client || 0);
        countryMap[c].profit  += Number(s.profit_for_platform || 0);
    });

    const totalCountryRevenue = Object.values(countryMap)
        .reduce((sum, c) => sum + c.revenue, 0);

    const countries = Object.entries(countryMap)
        .sort((a, b) => b[1].revenue - a[1].revenue);

    const countryBody = document.getElementById("kpi_country_breakdown");
    if (countryBody) {
        countryBody.innerHTML = countries.length === 0
            ? `<tr><td colspan="5" style="text-align:center;padding:18px;color:#9ca3af;">No data yet</td></tr>`
            : countries.map(([country, d]) => {
                const share = totalCountryRevenue > 0
                    ? ((d.revenue / totalCountryRevenue) * 100).toFixed(1)
                    : 0;
                return `
                <tr>
                    <td style="font-weight:600;">🌍 ${country}</td>
                    <td>${d.orders}</td>
                    <td style="color:var(--blue);font-weight:700;">$${d.revenue.toFixed(2)}</td>
                    <td style="color:var(--success);font-weight:700;">$${d.profit.toFixed(2)}</td>
                    <td>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div style="flex:1;background:#f0f0f0;border-radius:999px;height:8px;overflow:hidden;">
                                <div style="background:var(--red);height:100%;width:${share}%;"></div>
                            </div>
                            <span style="font-weight:600;min-width:42px;">${share}%</span>
                        </div>
                    </td>
                </tr>`;
            }).join('');
    }

    // ════════════════════════════════
    // CATEGORY BREAKDOWN
    // ════════════════════════════════

    const categoryMap = {};
    sales.forEach(s => {
        const c = s.category || "Uncategorized";
        if (!categoryMap[c]) categoryMap[c] = { orders: 0, units: 0, revenue: 0 };
        categoryMap[c].orders++;
        categoryMap[c].units   += Number(s.quantity_sold || 0);
        categoryMap[c].revenue += Number(s.total_income_for_seller || 0)
                                + Number(s.profit_for_platform || 0);
    });

    const categories = Object.entries(categoryMap)
        .sort((a, b) => b[1].revenue - a[1].revenue);

    const categoryBody = document.getElementById("kpi_category_breakdown");
    if (categoryBody) {
        categoryBody.innerHTML = categories.length === 0
            ? `<tr><td colspan="5" style="text-align:center;padding:18px;color:#9ca3af;">No data yet</td></tr>`
            : categories.map(([cat, d]) => {
                const catAOV = d.orders > 0 ? (d.revenue / d.orders) : 0;
                return `
                <tr>
                    <td style="font-weight:600;">📂 ${cat}</td>
                    <td>${d.orders}</td>
                    <td>${d.units}</td>
                    <td style="color:var(--success);font-weight:700;">$${d.revenue.toFixed(2)}</td>
                    <td style="color:var(--blue);font-weight:600;">$${catAOV.toFixed(2)}</td>
                </tr>`;
            }).join('');
    }
}

function setKPI(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}