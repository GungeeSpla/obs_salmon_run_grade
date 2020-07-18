/*
 * Copyright (c) 2019-2020 @GungeeSpla
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */

window.config_url = '../config.json';
window.json_url = '../json';
window.kuma_point_target = 0;
window.last_id = 99999;
window.latest_eval_id = 0;
window.latest_id = 0;
window.json_cache = {};
window.update_time = 5000;
window.kuma_point_sum = 0;
window.is_clear_array = [];
window.shift_num = 0;
window.win_num = 0;
window.lose_num = 0;
window.save_kuma_point = 0;
window.notfind_count = 0;
window.notfind_count_max = 50;
window.is_local_file = location.origin.indexOf('file://') > -1;
window.base_kuma_points = {
	'8000': [
			182,	 371,	 569,	 770,	 977,
		 1194,	1415,	1642,	1879,	2120,
		 2378,	2640,	2906,	3176,	3449,
		 3726,	4007,	4292,	4580,	4872,
		 5168,	5468,	5771,	6078,	6389,
		 6704,	7022,	7344,	7670,	8000,
	],
	'18000': [
			427,	 868,	1322,	1790,	2271,
		 2770,	3283,	3811,	4353,	4910,
		 5486,	6070,	6662,	7263,	7872,
		 8489,	9115,	9749, 10391, 11042,
		11701, 12369, 13045, 13729, 14422,
		15123, 15832, 16550, 17276, 18000,
	],
	'19000': [
			454,	 922,	1403,	1902,	2415,
		 2943,	3485,	4042,	4614,	5202,
		 5809,	6425,	7049,	7682,	8324,
		 8975,	9635, 10303, 10980, 11666,
		12361, 13065, 13777, 14498, 15228,
		15967, 16715, 17471, 18236, 19000,
	],
	'20000': [
			483,	 981,	1493,	2020,	2561,
		 3117,	3689,	4276,	4879,	5497,
		 6135,	6782,	7438,	8104,	8779,
		 9463, 10156, 10859, 11571, 12292,
		13022, 13762, 14511, 15269, 16036,
		16813, 17599, 18394, 19198, 20000,
	],
};
 
/* 
 * init()
 */
function init() {
	// ロードしたよ
	console.log('htmlファイルを読み込んだよ');
	// デバッグ用
	if (location.host === '127.0.0.1') {
		document.body.style.setProperty('background-color', '#2B2');
	}
	// コンフィグファイルを読む
	get_config(function() {
		window.kuma_point_target = '' + (window.kuma_point_target || 0);
		// 1回描画する
		render({
			grade_point: grade_point,
			kuma_point_sum: 0,
		});
		// 最初のバイトIDを決定する
		get_first_id(function() {
			latest_eval_id = window.first_id - 1;
			latest_id = window.first_id - 1;
			update();
			setInterval(update, update_time);
		});
	});
};

/* 
 * get_config(success)
 */
function get_config(success) {
	console.group('rate-config.txt を読み込むよ！');
	// ajaxでjsonを取得する
	ajax({
		type: 'text',
		url: './rate-config.txt',
		success: function (res) {
			console.log('rate-config.txt を読み込んだよ');
			console.log('設定を読み取るよ');
			var lines = res.split('\n');
			var key = '';
			for (var i = 0; i < lines.length; i++) {
				var line = lines[i];
				var str = line.trim();
				if (str.indexOf('# ') === 0) {
					if (!key) {
						key = str.split('# ')[1];
					}
				} else if (key && str) {
					console.log(key + ' = ' + str);
					window[key] = parseInt(str);
					key = '';
				}
			}
			console.log('設定を読み取ったよ');
			console.groupEnd();
			if (success) success();
		},
		error: function () {
			console.error('rate-config.txt を読み込めなかったよ…');
			console.groupEnd();
		}
	});
}

/* 
 * update()
 */
function update() {
	console.log('更新するよ！');
	get_json_all(latest_eval_id, last_id, function () {
		//console.log('最後に計算したバイトID: ' + latest_eval_id)
		//console.log('取得した最新のバイトID: ' + latest_id)
		var new_count = latest_id - latest_eval_id;
		if (new_count <= 0) {
			console.info('新着リザルトはないよ…');
		} else {
			console.info(new_count + '件の新着リザルトがあるよ！');
			while (latest_eval_id < latest_id) {
				latest_eval_id++;
				eval_json(latest_eval_id);
			}
			render({
				grade_point: grade_point,
				kuma_point_sum: kuma_point_sum,
				save_kuma_point: save_kuma_point,
			});
		}
	});
}

/* 
 * eval_json(id)
 */
function eval_json(id) {
	// id が未定義ならば latest_id を持ってくる
	if (typeof id === 'undefined') id = latest_id;
	console.log(id + '.json を評価するよ！');
	get_json(id, function (json) {
		// そのjsonが現在オープン中のバイトのものでなければ処理を止める
		if (! ask_opening(json)) {
			console.log('…いまのシフトのリザルトじゃないから無視するよ');
			return;
		}
		// バイト後の評価
		grade_point = json.grade_point;
		// クマサンポイント
		kuma_point_sum += json.kuma_point;
		// 白星･黒星配列へのpushとshift
		is_clear_array.push(json.job_result.is_clear);
		if (is_clear_array.length > star_length) is_clear_array.shift();
		// 成功回数と失敗回数のカウント
		if (json.job_result.is_clear) win_num++;
		else lose_num++;
		// 目標クマサンポイントとの差
		if (typeof base_kuma_points[kuma_point_target] !== 'undefined' &&
				typeof base_kuma_points[kuma_point_target][shift_num] !== 'undefined' &&
				lose_num === 0) {
			save_kuma_point = base_kuma_points[kuma_point_target][shift_num] - kuma_point_sum;
			if (window.kuma_point_target !== '8000') {
				save_kuma_point *= -1;
			}
		} else {
			save_kuma_point = NaN;
		}
		shift_num++;
	}, function() {
		console.log('…取得できなかったよ');
	});
}

/* 
 * ask_opening(json)
 */
function ask_opening(json) {
	// jsonにはそのバイトの開始時刻t1と終了時刻t2の情報が入っている
	// 現在時刻がt1とt2の間にあるならjsonは現在開催中のバイトである
	var offset = 0; //-1 * 60 * 60;
	var now_time = Math.floor(new Date().getTime() / 1000) + offset;
	var start_time = json.start_time;
	var end_time = json.end_time;
	return (start_time < now_time) && (now_time < end_time);
}

/* 
 * render(data)
 * dataを受け取ってそれをhtmlとして描画する
** data.grade_point		... 現在の評価
** data.kuma_point_sum ... 合計クマサンポイント
** is_clear_array			... 白星･黒星の配列
 */
function render(data) {
	console.log('描画するよ！');
	var star_html = '';
	for (var i = 0; i < is_clear_array.length; i++) {
		var bool = is_clear_array[i];
		var class_name = '';
		if (bool) class_name = 'winstar';
		else class_name = 'losestar';
		var star = ('<span class="%class_name">●</span>').replace('%class_name', class_name);
		star_html += star;
	}
	var grade_html = 'RATE<span class="number">%grade_point</span>';
			grade_html = grade_html.replace('%grade_point', data.grade_point);
	var point_html = '<span class="number">%kuma_point_sum</span>p';
			point_html = point_html.replace('%kuma_point_sum', data.kuma_point_sum);
	var save_html	= "　 (貯金 <span class='number'>%save_kuma_point</span>p)";
			save_html	= save_html.replace("%save_kuma_point", data.save_kuma_point);
	if (isNaN(data.save_kuma_point)) save_html = "";
	if (window.kuma_point_target !== '0') {
		document.querySelector('.rate').innerHTML = grade_html + "　 " + point_html + save_html;
	} else {
		document.querySelector('.rate').innerHTML = grade_html;
	}
	if (window.is_star_visible) {
		document.querySelector('.star').innerHTML = star_html;
	}
}

/* 
 * get_json_all(first_job_id, final_job_id, call_back)
 */
function get_json_all(first_job_id, final_job_id, call_back) {
	console.group('最新までのバイトデータを取得するよ！');	
	var find_count = 0;
	var job_id = first_job_id;
	var error, success;
	// エラーが発生したら即座にcall_backを実行
	error = function(){
		notfind_count++;
		if (notfind_count > notfind_count_max) {
			console.log('最新のバイトIDは ' + latest_id + ' だよ');
			for (var i = first_job_id; i < latest_id; i++) {
				if (typeof json_cache[i] === 'undefined') {
					json_cache[i] = null;
				}
			}
			console.groupEnd();
			if (call_back) call_back();
		} else {
			job_id++;
			get_json(job_id, success, error);
		}
	};
	// 取得に成功したらjob_idをインクリメントして次のjsonを取得しようとする
	success = function(res) {
		latest_id = job_id;
		job_id++;
		find_count++;
		if (job_id <= final_job_id) {
			get_json(job_id, success, error);
		} else {
			console.log('限界に達したよ！');
			console.log('最新のバイトIDは ' + latest_id + ' だよ');
			console.groupEnd();
			if (call_back) call_back();
		}
	};
	// スタート
	get_json(job_id, success, error);
}

/* 
 * get_first_id(call_back)
 */
function get_first_id(call_back) {
	console.group('探索を開始する最初のバイトIDを決めるよ！');
	if (window.first_id === 0) {
		console.log('first_id に 0 が指定されているので config.json を読み込むよ');
		ajax({
			url: config_url,
			success: function (res) {
				console.log('config.json を読み込んだよ');
				window.first_id = res.latest || res.job_id.local || res.job_id.splatnet2 || res.job_id.salmonstats;
				console.log('最初のバイトIDは ' + first_id + ' だよ！');
				console.groupEnd();
				if (call_back) call_back();
			},
			error: function () {
				console.error('config.json が読み込めなかったよ…');
				console.groupEnd();
				if (call_back) call_back();
			}
		});
	} else {
		console.log('first_id に ' + first_id + ' が直接指定されているよ');
		console.log('最初のバイトIDは ' + first_id + ' だよ！');
		console.groupEnd();
		if (call_back) call_back();
		return;
	}
}

/* 
 * get_json(job_id, success, error)
 */
function get_json(job_id, success, error) {
	if (json_cache[job_id] === null) {
		if (error) error();
	} else if (typeof json_cache[job_id] !== 'undefined') {
		if (success) success(json_cache[job_id]);
	} else {
		// ajaxでjsonを取得する
		ajax({
			url: json_url + '/' + job_id + '.json',
			success: function (res) {
				console.log(job_id + '.json を取得したよ！');
				json_cache[job_id] = res;
				if (success) success(res);
			},
			error: function () {
				if (error) error();
			}
		});
	}
}

/* 
 * ajax(opt)
 */
function ajax(opt) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', opt.url, true);
	xhr.responseType = 'text';
	xhr.onreadystatechange = function (event) {
		if (xhr.readyState === 4) {
			if (is_local_file || xhr.status === 200) {
				var data = xhr.responseText;
				if (typeof data === 'string' && opt.type !== 'text') data = JSON.parse(data);
				if (opt.success) return opt.success(data);
			} else {
				if (opt.error) return opt.error();
			}
		}
	};
	xhr.onerror = function (event) {
		if (opt.error) opt.error();
	};
	xhr.send(null);
}