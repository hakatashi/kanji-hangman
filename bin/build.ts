import scrapeIt from 'scrape-it';
import download from 'download';
import fs from 'fs-extra';

(async () => {
	const {data} = await scrapeIt<{files: string[]}>('http://git.chise.org/gitweb/?p=chise/ids.git;a=tree', {
		files: {
			listItem: 'td.list .list',
		}
	});
	const ucsFiles = data.files.filter((file) => file.startsWith('IDS-UCS-'));

	for (const file of ucsFiles) {
		const filePath = `${__dirname}/files/${file}`;
		const dirPath = `${__dirname}/files`;

		await fs.ensureDir(dirPath);
		if (!(await fs.pathExists(filePath))) {
			console.log(`Downwloading ${file}...`);
			await download(`http://git.chise.org/gitweb/?p=chise/ids.git;a=blob_plain;f=${file};hb=HEAD`, dirPath);
		}

		const data = await fs.readFile(filePath);
		for (const line of data.toString().split('\n')) {
			// console.log(line);
		}
	}
})()