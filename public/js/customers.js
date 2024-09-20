// Filter customers based on search input
function filterCustomers() {
    let input = document.getElementById('searchInput').value.toLowerCase();
    let table = document.getElementById('customerTable');
    let rows = table.getElementsByTagName('tr');

    for (let i = 1; i < rows.length; i++) {
        let tdName = rows[i].getElementsByTagName('td')[0];
        let tdEmail = rows[i].getElementsByTagName('td')[1];

        if (tdName || tdEmail) {
            let nameText = tdName.textContent || tdName.innerText;
            let emailText = tdEmail.textContent || tdEmail.innerText;

            if (nameText.toLowerCase().indexOf(input) > -1 || emailText.toLowerCase().indexOf(input) > -1) {
                rows[i].style.display = '';
            } else {
                rows[i].style.display = 'none';
            }
        }
    }
}

// Toggle status between 'Active' and 'Blocked'
function toggleStatus(customerId) {
    let statusElement = document.getElementById('status-' + customerId);
    if (statusElement.innerHTML === 'Active') {
        statusElement.innerHTML = 'Blocked';
    } else {
        statusElement.innerHTML = 'Active';
    }
}
