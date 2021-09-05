module.exports = {
	deleted_done: 'Item has been deleted successfully.',
	failed_auth: 'Failed to authenticate token.',
	failed_auth_app: 'There was a problem checking the application.',
	failed_auth_user: 'There was a problem checking user credentials.',
	failed_create_auth_app: 'There was a problem registering the application.',
	id_not_valid: 'Id is not valid',
	item_not_exists: 'Item is not exists',
	no_token: 'No token provided.',
	order_confirmed: (points_winned, new_points) => {
		return `مبروك ربحت ${points_winned} نقطة برصيد نقاطك اصبح الرصيد ${new_points} نقطة`;
	},
	order_status: 'حالة الطلب: تم التسليم',
	quantity_not_valid: 'Quantity is not valid',
	saved_done: 'Item has been saved successfully.',
	unexpected_error: 'Unexpected error',
	unauthorized_user: "You don't have permission to access this page",
	unsupported_file_types: "Error: File upload only supports the following filetypes",

	order_status_list: {
		"0": 'لم يتم التأكيد',
		"1": 'معلق',
		"2": 'جاري التجهيز',
		"3": 'جاري التوصيل',
		"4": 'تم التوصيل',
		"5": 'ملغي',
		"6": 'مرفوض',
		"7": 'تم التأكيد',
		"8": 'مردود',
		"9": 'تم عكس الطلب',
		"10": 'إعادة جزء من المبلغ',
		"11": 'إعادة كامل المبلغ',
		"12": 'جاهز للتوصيل',
		"13": 'انتهاء الوقت',
		"14": 'الطلب باطل',
	}
};
