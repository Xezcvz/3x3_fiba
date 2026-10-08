const CATEGORY_LABELS = {
  'รุ่น A': 'รุ่น U18',
  'รุ่น B': 'รุ่นบุคคลภายนอก',
};

export const categoryLabel = (category) => CATEGORY_LABELS[category] || category;
