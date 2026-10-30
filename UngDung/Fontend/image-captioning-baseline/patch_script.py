with open('frontend/script.js', 'a', encoding='utf-8') as f:
    f.write('''
let datasetsInfo = {};
async function fetchDatasetsStatus() {
    try {
        const res = await fetch('/api/datasets');
        if (!res.ok) return;
        const data = await res.json();
        const select = document.getElementById('evalDatasetSelect');
        const statusText = document.getElementById('datasetConfigStatus');
        if (!select || !statusText) return;
        
        data.datasets.forEach(d => {
            let key = '';
            if(d.name === 'Custom JSON') key = 'custom';
            if(d.name === 'MS COCO') key = 'mscoco';
            if(d.name === 'Flickr30K') key = 'flickr30k';
            datasetsInfo[key] = d;
        });
        
        function updateStatus() {
            const val = select.value;
            const info = datasetsInfo[val];
            if(info) {
                if(info.is_configured) {
                    statusText.innerHTML = '<span style="color: #166534; font-weight: 600;">✓ Configured</span> (' + info.sample_count + ' samples)';
                } else {
                    statusText.innerHTML = '<span style="color: #b91c1c; font-weight: 600;">⚠ Not Configured</span> (Missing dataset files/annotations)';
                }
            }
        }
        
        select.addEventListener('change', updateStatus);
        updateStatus();
    } catch(err) {
        console.error("Dataset status error", err);
    }
}
fetchDatasetsStatus();
''')
