module.exports = {
	deleted_done: 'Item has been deleted successfully.',
	failed_auth: 'Failed to authenticate token.',
	failed_auth_app: 'There was a problem checking the application.',
	failed_auth_user: 'There was a problem checking user credentials.',
	failed_create_auth_app: 'There was a problem registering the application.',
	id_not_valid: 'Id is not valid',
	item_not_exists: 'Item is not exists',
	no_token: 'No token provided.',
	logout_done: 'تم تسجيل الخروج بنجاح',
	not_exists: (doc, field) => 'No ' + doc + ' associated with the given ' + field,
	"coupon_refresh_juice": (code) => 'مبروك ربحت كود خصم ( ' + code + ' ) بقيمه ٥٠٪ من تطبيق رفرش جوس عند استلامك الطلب من احد فروعنا ، حمل التطبيق Https://onelink.to/refresh ابحث عن اقرب فرع بجميع المحافظات داخل التطبيق',
	"order_notification_body_2": "جاري تجهيز طلبكم الان",
	"order_notification_title_2": "حالة الطلب",

	"order_notification_body_3": "تم تحميل طلبك مع السائق وجاري التوصيل",
	"order_notification_title_3": "حالة الطلب",

	"order_notification_body_4": "تم اتمام الطلب بنجاح وتم تحديث نقاطك شكرا لاستخدامكم جمعية دوت كوم",
	"order_notification_title_4": "حالة الطلب",

	"order_notification_body_5": "نأسف لقد تم الغاء طلبكم لوجود بعض النواقص نتمنى لكم تسوق افضل بالمرات القادمة",
	"order_notification_title_5": "حالة الطلب",

	"order_notification_body_6": "نأسف لقد تم رفض الطلب لوجود نقص بالبيانات او عدم القدرة بالتواصل معكم وشكرا",
	"order_notification_title_6": "حالة الطلب",

	"order_notification_body_7": "تم تأكيد طلبك بنجاح",
	"order_notification_title_7": "حالة الطلب",

	"order_notification_body_8": "تم رد طلبكم لعدم الرد على السائق يرجى التواصل مع خدمة العملاء بالشات",
	"order_notification_title_8": "حالة الطلب",

	"order_notification_body_10": "تم تحميل طلبك مع السائق وجاري التوصيل",
	"order_notification_title_10": "حالة الطلب",


	"order_notification_body_12": "تم تجهيز طلبك وبانتظار السائق للتوصيل",
	"order_notification_title_12": "حالة الطلب",

	"order_notification_body_13": "نأسف لم يتم تأكيد طلبك يرجى مراجعة خدمة العملاء بالشات",
	"order_notification_title_13": "حالة الطلب",

	tracking_eta_label: "وقت التوصيل المتوقع",
	tracking_on_time: "في الوقت المحدد",
	tracking_guarantee: "مضمون في الوقت المحدد",
	tracking_title_1: "استلمنا طلبك",
	tracking_body_1: (orderId) => `استلمنا طلبك وجاري تأكيده • #${orderId}`,
	tracking_title_11: "تم تأكيد طلبك",
	tracking_body_11: (orderId) => `تم تأكيد طلبك • #${orderId}`,
	tracking_title_14: "جارٍ تجهيز طلبك",
	tracking_body_14: (orderId) => `جارٍ تجهيز طلبك • #${orderId}`,
	tracking_title_8: "تم تجهيز طلبك",
	tracking_body_8: (orderId) => `تم تجهيز طلبك وينتظر المندوب • #${orderId}`,
	tracking_title_18: "مندوبك في الطريق",
	tracking_body_18: (orderId) => `مندوبك في الطريق • #${orderId}`,
	tracking_title_10: "مندوبك يصل الآن",
	tracking_body_10: (orderId) => `مندوبك يصل الآن • #${orderId}`,
	tracking_title_4: "تم تسليم طلبك!",
	tracking_body_4: (orderId) => `تم تسليم طلبك! • #${orderId}`,
	tracking_title_15: "لم يتم الرد",
	tracking_body_15: (orderId) => `لم يتم الرد • #${orderId}`,
	tracking_title_16: "إعادة جدولة",
	tracking_body_16: (orderId) => `إعادة جدولة • #${orderId}`,

	quantity_not_valid: 'Quantity is not valid',
	saved_done: 'Item has been saved successfully.',
	unexpected_error: 'Unexpected error',
	unauthorized_user: "You don't have permission to access this page",
	unsupported_file_types: "Error: File upload only supports the following filetypes",
	order_not_confirmed: "لم يتم تأكيد هذا الطلب بعد.",
	order_not_delivering: "يجب أن يكون الطلب في حالة التوصيل لبدء التوصيل.",

	order_status_list: {
		"0": 'لم يتم التأكيد',
		"1": 'معلق',
		"2": 'جاري التجهيز', //
		"3": 'جاري التوصيل', //
		"4": 'تم التوصيل', //
		"5": 'ملغي',
		"6": 'مرفوض',
		"7": 'تم التأكيد', //
		"8": 'تم التجهيز بنجاح',
		"9": 'تم عكس الطلب',
		"10": 'إعادة جزء من المبلغ',
		"11": 'تم التاكيد بنجاح',
		"12": 'جاهز للتوصيل', //
		"13": 'انتهاء الوقت',
		"14": 'جاري تجهيز الطلب',
		"15": 'لا يرد على السايق',
		"16": 'العميل طلب تاجيل الطلب',
		"17": 'جاهز',
		"18": 'جاري توصيل الطلب'
	},
	product_floors: {
		"1": "السرداب",
		"2": "الارضي",
		"3": "الاول",
		"4": "مورد خارجي",
		"5": "رفرش"
	},
	order_being_processed: "جاري تجهيز الطلب من قبل مورد آخر",
	cashback_notification_title: "مبارك عليك 🥳 ٥٠٪ كاش باك ",
	cashback_notification_body: (amount) => `تم ايداع (${amount} د.ك ) برصيد حسابك في تطبيق جمعية دوت كوم`,
};
