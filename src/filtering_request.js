import { initializeApp } from "firebase/app";
import { 
    getFirestore, collection, onSnapshot, doc, deleteDoc, 
    runTransaction, query, where, getDocs, 
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